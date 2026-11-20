# remoteUniden
NodeJS server for remote control of Uniden UBC125XLT(and others)

Currently I'm running that on Raspberry Pi Zero 2W + UBC125XLT + USB Audio Card

# Introduction
That is in really early stage, loooks not so great but it is working!

PrintScreen of html page:
![image](https://github.com/telewizoor/remoteUniden/assets/67103591/bffc9a78-c214-478c-b5c3-2cd4c3eca3c0)

It has IceCast2 stream for audio and it allows to save last 10(configurable) recordings:
![image](https://github.com/telewizoor/remoteUniden/assets/67103591/291189db-a66e-48b2-8c06-fe4c58683f46)

# Features
1. That software is 'asking' Uniden about it's status every 250ms(configurable) and parsing the response. In case of received transmission the squelch is turned off for a minimum time *normChTimeout* but for special channels the timeout is longer(by default) - *specChTimeout*. That helps to listen weak signal transmission and avoid reception breaks. 

2. There is an option to choose priority channels. That channels will be added to configured banks at first 5 positions. Channel can be easily added to priority by clicking corresponding button near to last calls recordings.

3. Site is protected with password. You need to calculate SHA256 of your password and add it to configuration file(config/default.json). Without password you can only listen live audio and last calls.

4. Telegram bot can be activated. You need to create own Telegram bot and put the token in configuration file. Telegram bot will send a message when key word exist in last call name.

**Security:** The password hash is used as a credential. HTTP does not protect it in transit, and HTTPS alone does not address application vulnerabilities. Restrict access to trusted networks or a VPN until the application is hardened. Do not commit passwords or tokens.

# How to install on new raspberry

# Instruction for fresh Trixie Raspberry Pi Zero 2W(no desktop)

If you forward ports to the Raspberry Pi, reserve a static IP address for it in your router.

Install:
```
sudo apt-get install git
sudo apt-get install nodejs
sudo apt-get install npm
sudo apt-get install sox
sudo apt-get install libsox-fmt-mp3
sudo apt-get install icecast2
```

Configure icecast2 - remember choosen password!:
```
hostname: remoteUniden
password: password
```

Create some folder for everything:
```
mkdir Project
cd Project
```

Install darkice for audio stream:
```
sudo apt-get install darkice
mkdir darkice
cd darkice
touch darkice.cfg
touch darkice.sh
chmod +x darkice.sh
```

Edit darkice.cfg(sudo nano darkice.cfg) - change password!:
```
sudo nano darkice.cfg
```

and paste(modify password!):
```
# this section describes general aspects of the live streaming session
[general]
duration     = 0     # duration of encoding, in seconds. 0 means forever
bufferSecs   = 5     # size of internal slip buffer, in seconds
reconnect    = yes   # reconnect to the server(s) if disconnected
# this section describes the audio input that will be streamed
[input]
device          = default  # Soundcard device for the audio input
sampleRate      = 44100     # sample rate in Hz. try 11025, 22050 or 44100
bitsPerSample   = 16        # bits per sample. try 16
channel         = 1         # channels. 1 = mono, 2 = stereo
# this section describes a streaming connection to an IceCast2 server
# there may be up to 8 of these sections, named [icecast2-0] ... [icecast2-7]
[icecast2-0]
bitrateMode     = cbr       # average bit rate
format          = mp3       # format of the stream: ogg vorbis
bitrate         = 320       # bitrate of the stream sent to the server
server          = 127.0.0.1 # Icecast server on this Raspberry Pi
port            = 8000      # port of the IceCast2 server, usually 8000
password        = password       # source password to the IceCast2 server
mountPoint      = Stream.mp3  # mount point of this stream on the IceCast2 server
name            = Uniden # name of the stream
description     = Uniden Scanner connected to Raspberry # description of the stream
lowpass         = 6000
highpass        = 100
#public          = yes       advertise this stream?
```

Protect the configuration file, which contains the Icecast source password:
```
sudo chown root:root darkice.cfg
sudo chmod 600 darkice.cfg
```

Edit darkice.sh(sudo nano darkice.sh):
```
sudo nano darkice.sh
```

and paste(modify username!):
```
sudo /usr/bin/darkice -c /home/pi/Project/darkice/darkice.cfg
```

Configure audio input:
```
sudo alsamixer
```

F4 -> disable auto gain control with '.' key('MM' means turned off)

Clone this repo:
```
cd ~/Project/
git clone https://github.com/telewizoor/remoteUniden.git
cd remoteUniden
mkdir rec
mkdir saved_rec
```

Install nodejs packages:
```
npm install
```

Configure remoteUniden, place SHA256 of your password, set port to 80:
```
sudo nano config/default.json
```

The configuration file is tracked by Git. Do not commit local passwords, hashes, or Telegram tokens.

Run:
```
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

Create system service for nodejs server:
```
sudo nano /etc/systemd/system/remote-uniden.service
```

The current application uses privileged commands, so this example runs Node as root. This increases the impact of an application compromise; restrict network access until the application is updated to run without root privileges.

and paste:
```
[Unit]
Description=Remote Uniden Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Project/remoteUniden
ExecStart=sudo /bin/bash /home/pi/Project/remoteUniden/start.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create system service for darkice(audio server):
```
sudo nano /etc/systemd/system/darkice-start.service
```

and paste:
```
[Unit]
Description=Darkice Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Project/darkice
ExecStart=/bin/bash /home/pi/Project/darkice/darkice.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

Reload and run new services:
```
sudo systemctl daemon-reload
sudo systemctl enable darkice-start
sudo systemctl start darkice-start
sudo systemctl enable remote-uniden
sudo systemctl start remote-uniden
```

Check service status:
```
sudo systemctl status darkice-start.service
sudo systemctl status remote-uniden.service
```

If DarkIce reports a password error, check that the source password in its configuration matches the Icecast configuration. Review the service logs without sharing passwords:
```
sudo journalctl -u darkice-start.service -n 50 --no-pager
```

Change raspberry config:
```
sudo nano /boot/firmware/config.txt
```

and add to proper lines:
```
dtparam=audio=off
dtoverlay=vc4-kms-v3d,nohdmi
```

Reboot raspberry:
```
sudo reboot
```

# Configure OVH DynHost (optional)

Install the required tools, then download and review the script before installing it:
```
sudo apt update
sudo apt install bind9-host curl wget
wget https://raw.githubusercontent.com/RaspbianFrance/dyndnsovh/master/dyndns.sh -O /tmp/dyndns.sh
less /tmp/dyndns.sh
sudo install -o root -g root -m 700 /tmp/dyndns.sh /usr/local/sbin/dyndns.sh
```

Edit the installed script and set your DynHost credentials and domain. The file is readable only by root; do not share or commit it.
```
sudo nano /usr/local/sbin/dyndns.sh
```

```
DYNHOST_ID='xxx.pl-user'
DYNHOST_PASSWORD='pass'
DOMAIN_NAME='xxx.pl'
```

Run the script and check the response:
```
sudo /usr/local/sbin/dyndns.sh
```

Add a periodic call to root's crontab:
```
sudo crontab -e
```

And paste at the end:
```
*/5 * * * * /usr/local/sbin/dyndns.sh 2>&1 | logger -t dyndns
```

----------------------------------------------------------------

The following UFW rules are an example, not a complete security policy. Before enabling UFW, allow SSH from your actual management network, including VPN interfaces if needed, or you may lose access. Ports 80 and 8000 will be reachable on allowed interfaces; do not expose the application to untrusted networks without additional protection. Check IPv6 rules as well.

```
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80
sudo ufw allow 8000
sudo ufw allow from 192.168.0.0/16 to any port 22
sudo ufw enable
```

USB problems on RPi3:
```
ls /sys/bus/usb/devices/
grep -r "1b3f" /sys/bus/usb/devices/*/idVendor 2>/dev/null
# zastąp 1-1.X właściwą ścieżką z kroku wyżej
echo -1 | sudo tee /sys/bus/usb/devices/1-1.X/power/autosuspend
echo on | sudo tee /sys/bus/usb/devices/1-1.X/power/control

cat /etc/udev/rules.d/50-usb-audio-nosuspend.rules

echo 'ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="1b3f", ATTR{idProduct}=="2008", ATTR{power/control}="on"' | sudo tee -a /etc/udev/rules.d/50-usb-audio-nosuspend.rules

sudo udevadm control --reload-rules
sudo udevadm trigger
cat /sys/bus/usb/devices/1-1.*/power/autosuspend
```

Alternatywna reguła ustawiająca autosuspend na -1:
```
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="1b3f", ATTR{idProduct}=="2008", TEST=="power/autosuspend", ATTR{power/autosuspend}="-1"
```

```
sudo udevadm control --reload-rules
sudo udevadm trigger
cat /sys/bus/usb/devices/1-1.*/power/autosuspend 2>/dev/null
```

---

### 3. Parametry kernela — bufor USB i quirki

Dodaj do `/boot/cmdline.txt` (wszystko w jednej linii!):
```
dwc_otg.fiq_fsm_enable=1 dwc_otg.fiq_fix_enable=1
```

Jeśli już są — sprawdź czy nie ma `dwc_otg.fiq_fsm_enable=0`.

Opcjonalnie, wyłącz FIQ split (czasem pomaga przy audio):
```
dwc_otg.fiq_fsm_mask=0xF
```
