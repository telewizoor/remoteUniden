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

# How to install on new raspberry

**Tested on:**
Linux raspberrypi 6.6.31+rpt-rpi-v7 #1 SMP Raspbian 1:6.6.31-1+rpt1 (2024-05-29) armv7l

**HW:**
raspberry pi zero 2 w

**Set static IP for raspberry in your router.**

Installing required packages:
```
sudo apt-get install git
sudo apt-get install nodejs
sudo apt-get install npm
sudo apt-get install sox
sudo apt-get install libsox-fmt-mp3
sudo apt-get install icecast2
```

Configure icecast2 - **remember choosen password!**:
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

Edit darkice.cfg(sudo nano darkice.cfg) - **change password!**:
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
    server          = 0.0.0.0 # host name of the server
    port            = 8000      # port of the IceCast2 server, usually 8000
    password        = password       # source password to the IceCast2 server
    mountPoint      = Stream.mp3  # mount point of this stream on the IceCast2 server
    name            = Uniden # name of the stream
    description     = Uniden Scanner connected to Raspberry # description of the stream
    lowpass         = 6000
    highpass        = 100
    #public          = yes       advertise this stream?
```

Edit darkice.sh(sudo nano darkice.sh):

```
sudo nano darkice.sh
```

and paste:
```
/usr/bin/darkice -c /home/${USER}/Project/darkice/darkice.cfg
```

Configure audio input:
```
sudo alsamixer
```

**F4** -> disable auto gain control with '**.**' key

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
npm install package.json
```
    
Configure remoteUniden, place SHA256 of your password:

```
sudo nano config/default.json
```

Run:

```
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

Create system service for nodejs server:

```
sudo nano /etc/systemd/system/remote-uniden.service
```
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



For test run without reboot. Run darkice:

    /usr/bin/darkice -c /home/${USER}/Project/darkice/darkice.cfg &

CTRL+C, and run unidenServer:

    sudo node unidenServer.js


```
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80
sudo ufw allow 8000
sudo ufw allow from 192.168.0.0/16 to any port 22
sudo ufw enable
```

```
sudo nano /usr/local/sbin/dyndns.sh
```

```
crontab -e:
```
paste:
```
*/5 * * * * sudo /usr/local/sbin/dyndns.sh 2>&1 | logger -t dyndns
```


```
#!/bin/sh

#Define your OVH DynHost ID & password and the domain name for which you wish to update DynHost
DYNHOST_ID='radiomalina.pl-xxx'
DYNHOST_PASSWORD='xxx'
DOMAIN_NAME='xxx.radiomalina.pl'



#####################
####DO NOT TOUCH#####
#####################

PUBLIC_IP=$(host -4 myip.opendns.com resolver1.opendns.com | grep "myip.opendns.com has" | awk '{print $4}')

#Call OVH for update
curl --silent --user "$DYNHOST_ID:$DYNHOST_PASSWORD" "https://www.ovh.com/nic/update?system=dyndns&hostname=$DOMAIN_NAME&myip=$PUBLIC_IP"
```
