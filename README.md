# ASAR: Actually Smart AI Radio 🎙️🤖

ASAR is a cutting-edge Discord radio bot powered by OpenAI's GPT-4o, bringing AI-driven radio broadcasting to your Discord server. It combines news updates, music, and AI-generated commentary for a unique radio experience.

## Features ✨

- 🎵 24/7 Radio Broadcasting
- 🤖 GPT-4 Powered DJ Commentary
- 📰 Real-time News Integration
- 🎙️ Premium Voice Support (via ElevenLabs)
- 🌍 Multi-language Support
- 🎶 YouTube Playlist Integration
- ⚡ Auto-join Radio Channels
- 📢 Skip Command Support

## Prerequisites 📋

- Node.js (v16 or higher)
- npm (Node Package Manager)
- Discord Bot Token
- OpenAI API Key
- NewsAPI Key
- ElevenLabs API Key (Optional, for premium voice)

## Installation 🚀

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env-sample .env
```

4. Edit the `.env` file with your API keys and configuration.

## Configuration ⚙️

Configure your radio station by editing the following in your `.env` file:

- `OPENAI_API_KEY`: Your OpenAI API key
- `newsapikey`: Your NewsAPI key
- `discordtoken`: Your Discord bot token
- `language`: Preferred language for announcements
- `ytplaylist`: YouTube playlist ID for music
- `dataradio`: Radio station information
- `ELEVEN_LABS_API_KEY`: (Optional) For premium voice quality

## Usage 💡

1. Start the bot:
```bash
node index.js
```

2. The bot will automatically:
   - Join voice channels named "radio"
   - Play music from your configured playlist
   - Announce news with AI-generated commentary
   - Switch between songs and announcements

## Commands 🎮

- `skip`: Skip the current song/announcement

## Voice Options 🎙️

ASAR supports two voice modes:
1. Basic TTS (Default)
2. Premium ElevenLabs voice (requires API key)

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Support 💪

If you encounter any issues or have questions, please open an issue on GitHub.

Made with ❤️ by Neo
