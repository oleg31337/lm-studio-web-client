# lm-studio-web-client
## Local AI chat client for use with LM Studio
Full stack Node.js/JavaScript application that serves as a web client chat app for local LM studio server

## Features
 * Local session store for context data
 * Simple user interface
 * Markdown formatting of AI replies
 * Docker support

## Installation
1. Install node.js version 18 (So far tested) https://nodejs.org/en/download/package-manager/
2. Git clone the app from here https://github.com/oleg31337/lm-studio-web-client to a folder on local drive, for example: /opt/lm-studio-web-client
3. Go into the application folder and run "`npm install`" to install required node modules
### Example installation steps:
   ```bash
   mkdir /opt/lm-studio-web-client
   cd /opt/lm-studio-web-client
   git clone https://github.com/oleg31337/lm-studio-web-client .
   npm install
   ```

## Running the application in the command prompt
1. To run the app in the command prompt:
`npm start`
2. Wait until application will start the http service, then open your browser and navigate to: http://your-host:5000/

### Running in debugging mode:
1. Run application in the command prompt:
`npm run debug`

## Application data
Application stores the session data with context locally in 'sessions' folder.

## Application logs
By default all logging information is printed to a stdout.


## This application is not intended for business or professional use. Its main purpose is providing web client for lm-studio, so no implicit or explicit guarantees are provided for functionality or security. It was not designed with security or stability in mind. Please read LICENSE file for more information regarding responsibilities.