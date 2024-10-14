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

**Static IP:**

    sudo nmtui

And then configure to get static IP address.

Installing required packages:

    sudo apt-get install git
    sudo apt-get install nodejs
    sudo apt-get install npm
    sudo apt-get install sox
    sudo apt-get install libsox-fmt-mp3
    sudo apt-get install icecast2

Configure icecast2 - **remember choosen password!**:

    hostname: remoteUniden
    password: password

Create some folder for everything:
    
    mkdir Project
    cd Project

Install darkice for audio stream:

    sudo apt-get install darkice
    mkdir darkice
    cd darkice
    touch darkice.cfg
    touch darkice.sh
    chmod +x darkice.sh

Edit darkice.cfg(sudo nano darkice/darkice.cfg) - **change password!**:

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

Edit darkice.sh(sudo nano darkice/darkice.sh):

    sudo /usr/bin/darkice -c /home/${USER}/Project/darkice/darkice.cfg

Configure audio input:

    sudo alsamixer

**F4** -> disable auto gain control with '**.**' key

Clone this repo:

    git clone https://github.com/telewizoor/remoteUniden.git

Install nodejs packages:

    npm install package.json

And configure system to run darkice and remoteUniden server:

    crontab -e
    @reboot sleep 12 && sudo /home/${USER}/Project/darkice/darkice.sh
    @reboot sleep 15 && sudo /home/${USER}/Project/remoteUniden/start.sh

For test run without reboot. Run darkice:

    sudo /usr/bin/darkice -c darkice/darkice.cfg &

CTRL+C, and run unidenServer:

    sudo node remoteUnidenServer.js

I'm using duckdns.org to create free subdomain and use Uniden everywhere on the same address.



