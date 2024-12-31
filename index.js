require('dotenv').config(); // npm i dotenv

const { Client, GatewayIntentBits, ActivityType, ChannelType } = require('discord.js');
const { AudioPlayer, createAudioResource, StreamType, joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, getVoiceConnection } = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");
const ytpl = require('ytpl');
const discordTTS = require("discord-tts");
const NewsAPI = require('newsapi');
const { Configuration, OpenAIApi } = require('openai');

const newsapi = new NewsAPI(process.env.newsapikey);

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

let premiumVoice = true;
let dataradio = process.env.dataradio;

const ElevenLabs = require('elevenlabs-node');
let voice = undefined;
if(process.env.ELEVEN_LABS_API_KEY){
  voice = new ElevenLabs({
    apiKey: process.env.ELEVEN_LABS_API_KEY,
  });
}else{
  premiumVoice = false;
}

// Event listener for commands


let player = createAudioPlayer();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{ name: `Powered by Neo`, type: ActivityType.Listening }],
    status: 'online',
  });

  client.guilds.cache.forEach(async (guild) => {
    guild.channels.cache.forEach(async (channel) => {
      if (channel.name.toLowerCase().includes("radio")) {
        await connectToChannel(channel);
      }
    });
  });

  queue();
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if(commandName == "skip"){
    connection.player.stop();
    start()
  }
});

async function connectToChannel(channel) {
  console.log(`Connecting to channel: ${channel.name}`);
  try {
    const connection = await joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
      const newUdp = Reflect.get(newNetworkState, 'udp');
      clearInterval(newUdp?.keepAliveInterval);
    };

    connection.on('stateChange', (oldState, newState) => {
      Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
      Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
    });

    connection.subscribe(player);
    console.log('Successfully connected and subscribed to the channel');
  } catch (error) {
    console.error('Error connecting to channel:', error);
  }
}

async function start() {
  console.log('Starting radio...');
  player = createAudioPlayer();
  client.guilds.cache.forEach(async (guild) => {
    guild.channels.cache.forEach(async (channel) => {
      if (channel.name.toLowerCase().includes("radio")) {
        const connection = getVoiceConnection(guild.id);
        if (connection) {
          connection.subscribe(player);
        }
      }
    });
  });

  try {
    const todaysDate = new Date();
    const formattedDate = `${todaysDate.getFullYear()}-${String(todaysDate.getMonth() + 1).padStart(2, '0')}-${String(todaysDate.getDate()).padStart(2, '0')}`;

    const newsResponse = await newsapi.v2.topHeadlines({
      sources: 'bbc-news,the-verge,abc-news,al-jazeera-english,ars-technica,cnn',
      from: formattedDate,
      to: formattedDate,
      language: process.env.language,
      page: 1
    });

    if (newsResponse.status !== "ok" || !newsResponse.articles || newsResponse.articles.length === 0) {
      console.log('No articles found in response');
      playInitialMessage();
      return;
    }

    try {
      const playlist = await ytpl(process.env.ytplaylist, { limit: 100 });
      if (!playlist || !playlist.items || playlist.items.length === 0) {
        console.error('No valid items in playlist');
        playInitialMessage();
        return;
      }

      const nextSong = await getNextSong(playlist.items);
      if (!nextSong || !nextSong.shortUrl) {
        console.error('Could not get next song');
        playInitialMessage();
        return;
      }

      const newsItem = getRandomElement(newsResponse.articles);
      await get(newsItem, nextSong.title, nextSong.shortUrl);
    } catch (error) {
      console.error('Error in playlist handling:', error);
      playInitialMessage();
    }
  } catch (error) {
    console.error('Error in start function:', error);
    playInitialMessage();
  }
}

function playInitialMessage() {
  let resource = createAudioResource("./warte.mp3")
  player.play(resource)
}

async function getNextSong(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error('Invalid items array provided to getNextSong');
    return null;
  }

  try {
    // Try multiple items in case some are unavailable
    for (let i = 0; i < Math.min(5, items.length); i++) {
      const randomItem = getRandomElement(items);
      if (!randomItem || !randomItem.shortUrl) {
        console.warn('Invalid item found in playlist, skipping...');
        continue;
      }

      try {
        // Verify the video is available
        const videoInfo = await ytdl.getBasicInfo(randomItem.shortUrl);
        if (!videoInfo || videoInfo.videoDetails.isPrivate) {
          console.warn(`Video ${randomItem.shortUrl} is not available, skipping...`);
          continue;
        }

        return {
          title: randomItem.title ? randomItem.title.replace(/\[.*?\]|\(.*?\)/g, '').replace('-', 'with').trim() : 'Unknown Title',
          shortUrl: randomItem.shortUrl
        };
      } catch (error) {
        console.warn(`Skipping unavailable video: ${randomItem.title}`, error.message);
        continue;
      }
    }
    throw new Error('No available songs found after multiple attempts');
  } catch (error) {
    console.error('Error in getNextSong:', error);
    // Return a safe fallback
    return items[0] && items[0].shortUrl ? {
      title: "the next song",
      shortUrl: items[0].shortUrl
    } : null;
  }
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function get(newsItem, nextSong, url) {
  const todaysDate = new Date();
  const time = todaysDate.getHours()+":"+todaysDate.getMinutes();

  try {
    const prompt = `You are an AI DJ in an online radio station with these characteristics: ${JSON.stringify(dataradio)}. 
    This message comes after a song. Create an engaging radio announcement about this news: "${newsItem.title}".
    Use this data for accuracy: ${newsItem.description}
    Then announce that you'll play this song next: ${nextSong}
    Current time is: ${time}
    
    Important: Speak in ${process.env.language} and keep the tone natural and engaging.`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional radio DJ. Keep responses concise and engaging, perfect for radio broadcasting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const text = completion.data.choices[0].message.content;
    console.log('Generated text:', text);
    playAudio(url, text);
  } catch(err) {
    console.error('Error generating radio content:', err);
    playAudio(url, process.env.errormessage);
  }
}

async function playAudio(link, message) {
  console.log('Playing audio message and song...');

  if(premiumVoice == false){
  const messageParts = splitString(message);
  playTextToSpeechOld(messageParts.shift());
  setTimeout(function(){
  player.on(AudioPlayerStatus.Idle, () => {
    if (messageParts.length === 0) {
      player.removeAllListeners();
      playSong(link);
    } else {
      playTextToSpeechOld(messageParts.shift());
    }
  });
},3000)
}else{
  playTextToSpeech(message);
  setTimeout(function(){
    player.on(AudioPlayerStatus.Idle, () => {
      playSong(link);
  });
  },3000)

}
}

function playTextToSpeechOld(text) {
  const stream = discordTTS.getVoiceStream(text);
  const audioResource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
  player.play(audioResource);
}

async function playTextToSpeech(text) {
  const stream = await voice.textToSpeechStream({
    textInput: text,
    responseType: 'stream', // Stream the audio directly
    voiceId:         "Jdr9LWY1JEhgc5qzlOyT",         // A different Voice ID from the default
    modelId:         "eleven_multilingual_v2",       // The ElevenLabs Model ID
    responseType:    "stream",                       // The streaming type (arraybuffer, stream, json)    
  });

  const audioResource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

  player.play(audioResource);
}

async function playSong(link) {
  if (!link || typeof link !== 'string') {
    console.error('Invalid link provided to playSong:', link);
    queue();
    return;
  }

  console.log('Playing song:', link);
  
  try {
    // Validate URL before attempting to play
    try {
      await ytdl.getBasicInfo(link);
    } catch (error) {
      console.error('Invalid YouTube URL or video unavailable:', error);
      queue();
      return;
    }

    const stream = ytdl(link, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25, // 32MB buffer
      requestOptions: {
        headers: {
          cookie: process.env.YOUTUBE_COOKIE || '',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.5',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    });

    stream.on('error', (error) => {
      console.error('YouTube stream error:', error);
      queue();
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });

    resource.volume?.setVolume(1);
    
    // Remove existing listeners before adding new ones
    player.removeAllListeners();
    
    player.on(AudioPlayerStatus.Idle, () => {
      queue();
    });

    player.on('error', error => {
      console.error('Player error:', error);
      queue();
    });

    player.play(resource);

  } catch (error) {
    console.error('Error in playSong:', error);
    queue();
  }
}

async function queue() {
  const userCount = await connectedUsers();
  if (userCount > 0) {
    setTimeout(start, 1000);
  } else {
    setTimeout(queue, 1000);
  }
}

async function connectedUsers() {
  let userCount = 0;
  let guilds = new Set();

  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.name.toLowerCase().includes("radio")) {
        if (!guilds.has(guild.id)) {
          guilds.add(guild.id);
          userCount += channel.members.size;
        }
      }
    }
  }

  return userCount - guilds.size;
}

client.on("guildCreate", async (guild) => {
  let defaultChannel = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText);
  if (defaultChannel) {
    defaultChannel.send("Thank you for adding the AI-Powered Radio. I have created a channel for you, **if you already have one, delete it. You can never have duplicates with the name 'radio' in it!**");
  }

  const channel = await guild.channels.create({
    name: "radio",
    type: ChannelType.GuildVoice,
    parent: null,
  });

  await connectToChannel(channel);
});

function splitString(str) {
  const arr = [];
  while (str.length > 0) {
    let substr = str.substring(0, 200);
    if (substr.length === 200) {
      substr = substr.substring(0, Math.min(substr.length, substr.lastIndexOf(" ")));
    }
    arr.push(substr);
    str = str.substring(substr.length).trim(); // Corrected line
  }
  return arr;
}


client.login(process.env.discordtoken);
