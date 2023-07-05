# AIRadio - Discord Bot for a 24/7 Radio Station

## Description
AIRadio is a Discord bot designed to create a 24/7 radio station in your server. The bot automatically streams the latest news, music, and more to keep your server's members entertained at all times. It utilizes various APIs and libraries to fetch and play audio content.

## Setup
To set up AIRadio, follow these steps:

1. Clone or download the project from the GitHub repository.
2. Navigate to the project's directory and open a terminal.
3. Run the following command to initialize the project and install dependencies:
   ```
   npm install
   ```
4. Configure the bot inside the `index.js` file. Modify the necessary parameters such as API keys, channel IDs, etc., to suit your server's requirements.
5. Start the bot by running the following command:
   ```
   node index.js
   ```

## Prerequisites
Before running AIRadio, ensure that you have the following prerequisites installed:

- Node.js (version 12 or higher)

## Dependencies
AIRadio relies on the following dependencies, which will be automatically installed during the setup process:

- newsapi
- node-fetch
- ytpl
- ytdl-core
- discord-tts
- google-tts-api
- discord.js
- @discord.js/opus
- opusscript
- node-opus

## Usage
Once the bot is up and running, it will automatically join the specified voice channel in your Discord server (It has to include the name "radio"). It will then stream content such as news articles, music playlists, and more.

Refer to the code and comments in the `index.js` file to understand the available commands and their functionalities.

## Credits
AIRadio was created by Neotastisch in 2023. Proper credit must be given if you choose to use or modify this project.

## Contributing
If you would like to contribute to the development of AIRadio, feel free to fork the repository, make your changes, and submit a pull request. Contributions are always welcome!

## License
AIRadio is licensed under the [MIT License](https://opensource.org/licenses/MIT). Please see the `LICENSE` file for more details.

## Disclaimer
This project is provided as-is, without any warranty or guarantee of its functionality or suitability for any specific purpose. The creator of this project is not responsible for any issues or damages caused by the usage of this bot.

## Improve this README.md on GitHub
If you would like to contribute to improving this README.md file, you can make your changes on the GitHub repository. Simply submit a pull request with your proposed changes. Your contributions are greatly appreciated!
