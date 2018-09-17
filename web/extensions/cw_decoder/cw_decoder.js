// Copyright (c) 2018 John Seamons, ZL/KF6VO

var cw = {
   ext_name: 'cw_decoder',    // NB: must match cw_decoder.cpp:cw_decoder_ext.name
   first_time: true,
   pboff: -1,
   wspace: true,
   thresh: false,

   // must set "remove_returns" since pty output lines are terminated with \r\n instead of \n alone
   // otherwise the \r overwrite logic in kiwi_output_msg() will be triggered
   console_status_msg_p: { scroll_only_at_bottom: true, process_return_nexttime: false, remove_returns: true, ncol: 135 },

};

function cw_decoder_main()
{
	ext_switch_to_client(cw.ext_name, cw.first_time, cw_decoder_recv);		// tell server to use us (again)
	if (!cw.first_time)
		cw_decoder_controls_setup();
	cw.first_time = false;
}

function cw_decoder_recv(data)
{
	var firstChars = arrayBufferToStringLen(data, 3);
	
	// process data sent from server/C by ext_send_msg_data()
	if (firstChars == "DAT") {
		var ba = new Uint8Array(data, 4);
		var cmd = ba[0] >> 1;
		var ch = ba[0] & 1;
		var o = 1;
		var len = ba.length-1;

		console.log('cw_decoder_recv: DATA UNKNOWN cmd='+ cmd +' len='+ len);
		return;
	}
	
	// process command sent from server/C by ext_send_msg() or ext_send_msg_encoded()
	var stringData = arrayBufferToString(data);
	var params = stringData.substring(4).split(" ");

	for (var i=0; i < params.length; i++) {
		var param = params[i].split("=");

		if (0 && param[0] != "keepalive") {
			if (typeof param[1] != "undefined")
				console.log('cw_decoder_recv: '+ param[0] +'='+ param[1]);
			else
				console.log('cw_decoder_recv: '+ param[0]);
		}

		switch (param[0]) {

			case "ready":
				cw_decoder_controls_setup();
				break;

			case "cw_chars":
				cw_decoder_output_chars(param[1]);
				break;

			case "cw_wpm":
				w3_innerHTML('id-cw-wpm', param[1] +' WPM');
				break;

			case "cw_train":
			   var p = +param[1];
			   w3_innerHTML('id-cw-train', 'train '+ p +'/98');
            w3_show_hide('id-cw-train', p);
				break;

			default:
				console.log('cw_decoder_recv: UNKNOWN CMD '+ param[0]);
				break;
		}
	}
}

function cw_decoder_output_chars(c)
{
   cw.console_status_msg_p.s = c;      // NB: already encoded on C-side
   kiwi_output_msg('id-cw-console-msgs', 'id-cw-console-msg', cw.console_status_msg_p);
}

function cw_decoder_controls_setup()
{
   var data_html =
      time_display_html('cw') +
      
      w3_div('id-cw-data|width:'+ px(nt.lhs+1024) +'; height:200px; overflow:hidden; position:relative; background-color:black;',
         '<canvas id="id-cw-canvas" width="'+ (nt.lhs+1024) +'" height="200" style="left:0; position:absolute"></canvas>',
			w3_div('id-cw-console-msg w3-text-output w3-scroll-down w3-small w3-text-black|left:'+ px(nt.lhs) +'; width:1024px; height:200px; position:relative; overflow-x:hidden;',
			   '<pre><code id="id-cw-console-msgs"></code></pre>'
			)
      );

	var controls_html =
		w3_div('id-cw-controls w3-text-white',
			w3_divs('w3-container/w3-tspace-8',
            w3_col_percent('',
				   w3_div('w3-medium w3-text-aqua', '<b>CW decoder</b>'), 30,
					w3_div('', 'From Loftur Jonasson, TF3LJ / VE2LJX and <br> the <b><a href="https://github.com/df8oe/UHSDR" target="_blank">UHSDR project</a></b> &copy; 2016'), 55
				),
				w3_inline('',
               w3_button('w3-padding-smaller', 'Clear', 'cw_clear_cb', 0),
               w3_div('id-cw-wpm w3-margin-left', '0 WPM'),
               w3_checkbox('w3-margin-left w3-label-inline w3-label-right w3-label-not-bold', 'word space<br>correction', 'cw.wspace', true, 'cw_decoder_wsc_cb'),
               w3_checkbox('w3-margin-left w3-label-inline w3-label-right w3-label-not-bold', 'threshold<br>correction', 'cw.thresh', false, 'cw_decoder_thresh_cb'),
               w3_button('w3-margin-left w3-padding-smaller', 'Reset', 'cw_reset_cb', 0),
               w3_div('id-cw-train w3-margin-left w3-padding-small w3-hide|background-color:orange', 'train')
            )
			)
		);
	
	ext_panel_show(controls_html, data_html, null);
	time_display_setup('cw');

	ext_set_controls_width_height(550, 90);
	
   cw_clear_cb();
	ext_send('SET cw_start');
	cw.pboff = -1;
	cw_decoder_environment_changed();
}

function cw_decoder_environment_changed(changed)
{
   // detect passband offset change and inform C-side
   var pboff = Math.abs(ext_get_passband_center_freq() - ext_get_carrier_freq());
   if (cw.pboff != pboff) {
      //console.log('CW ENV new pboff='+ pboff);
	   ext_send('SET cw_pboff='+ pboff);
      cw.pboff = pboff;
   }
}

function cw_clear_cb(path, idx, first)
{
   if (first) return;
   cw.console_status_msg_p.s = encodeURIComponent('\f');
   kiwi_output_msg('id-cw-console-msgs', 'id-cw-console-msg', cw.console_status_msg_p);
}

function cw_decoder_wsc_cb(path, checked, first)
{
   if (first) return;
   ext_send('SET cw_wsc='+ (checked? 1:0));
}

function cw_decoder_thresh_cb(path, checked, first)
{
   if (first) return;
   ext_send('SET cw_thresh='+ (checked? 1:0));
}

function cw_reset_cb(path, idx, first)
{
   if (first) return;
   ext_send('SET cw_reset');
	cw.pboff = -1;
	cw_decoder_environment_changed();
}

function cw_decoder_blur()
{
	ext_set_data_height();     // restore default height
	ext_send('SET cw_stop');
}

function cw_decoder_help(show)
{
   if (show) {
      var s = 
         w3_text('w3-medium w3-bold w3-text-aqua', 'CW decoder help') +
         '<br>This is an early version of the decoder. Please consider it a work-in-progress. <br><br>' +
         'Use the CWN mode with its narrow passband to maximize the signal/noise ratio. <br>' +
         'The decoder doesn\'t do very well with weak or fading signals. <br>' +
         'Try the <i>threshold correction</i> checkbox to improve weak signal reception. <br>' +
         'The <i>word space correction</i> checkbox sets the algorithm used to determine word spacing. ' +
         '';
      confirmation_show_content(s, 610, 150);
   }
   return true;
}