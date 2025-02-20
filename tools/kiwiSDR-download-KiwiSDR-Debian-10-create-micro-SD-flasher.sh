#!/bin/bash -e
# Copyright (c) 2016-2019 John Seamons, ZL/KF6VO

# NB: this distro image is a flasher

VER="v1.486"
DEBIAN_VER="10.11"
CKSUM="676301a5ad0c52417011fd257da9ffa3106ad33af41c8b2273d49d44527e14f3"
#DROPBOX="cr9zwrc4jqds3re"

HOST="http://kiwisdr.com/files"
#HOST="https://www.dropbox.com/s/${DROPBOX}"
DISTRO="KiwiSDR_${VER}_BBB_Debian_${DEBIAN_VER}.img.xz"

echo "--- get KiwiSDR distro image from net and create micro-SD flasher"
echo -n "--- hit enter when ready: "; read not_used

rv=$(which xzcat || true)
if test "x$rv" = "x" ; then
	echo "--- get missing xz-utils"
    apt-get -y install debian-archive-keyring
    apt-get update
    apt-get -y install xz-utils
fi

if test ! -f ${DISTRO} ; then
	echo "--- getting distro"
	wget ${HOST}/${DISTRO}
else
	echo "--- already seem to have the distro file, verify checksum below to be sure"
fi
echo "--- computing checksum..."
sha256sum ${DISTRO}
echo "--- verify above checksum against:"
echo ${CKSUM} " correct checksum"
echo -n "--- hit enter when ready: "; read not_used

echo "--- insert micro-SD card"
echo -n "--- hit enter when ready: "; read not_used

echo "--- lsblk:"
lsblk

root_drive="$(cat /proc/cmdline | sed 's/ /\n/g' | grep root=UUID= | awk -F 'root=' '{print $2}' || true)"
if [ ! "x${root_drive}" = "x" ] ; then
	root_drive="$(/sbin/findfs ${root_drive} || true)"
else
	root_drive="$(cat /proc/cmdline | sed 's/ /\n/g' | grep root= | awk -F 'root=' '{print $2}' || true)"
fi
boot_drive="${root_drive%?}1"

if [ "x${boot_drive}" = "x/dev/mmcblk0p1" ] ; then
	source="/dev/mmcblk0"
	destination="/dev/mmcblk1"
fi

if [ "x${boot_drive}" = "x/dev/mmcblk1p1" ] ; then
	source="/dev/mmcblk1"
	destination="/dev/mmcblk0"
fi

echo "--- will now copy to ${destination} which should be the micro-SD card"
echo "--- CHECK lsblk ABOVE THAT ${destination} IS THE CORRECT DEVICE BEFORE PROCEEDING!"
echo -n "--- hit enter when ready: "; read not_used

echo "--- copying to micro-SD card, will take about 10 minutes"
xzcat -v ${DISTRO} | dd of=${destination}

echo "--- when next booted with micro-SD installed, KiwiSDR image should be copied to Beagle eMMC flash"
echo -n "--- hit ^C to skip reboot, else enter when ready to reboot: "; read not_used

echo "--- rebooting with flasher micro-SD installed will COMPLETELY OVERWRITE THIS BEAGLE's FILESYSTEM!"
echo -n "--- ARE YOU SURE? enter when ready to reboot: "; read not_used

echo "--- okay, rebooting to re-flash Beagle eMMC flash from micro-SD"
echo "--- you should see a back-and-forth pattern in the LEDs during the copy"
echo "--- after all the LEDs go dark (Beagle is powered off), remove micro-SD and power up"
echo "--- you should now be running KiwiSDR distro"
echo "--- rebooting now..."
reboot
