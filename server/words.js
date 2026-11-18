// Word banks grouped by age. Younger groups get short, concrete, easy-to-draw
// nouns; older groups get longer words, actions and ideas.
const WORDS = {
  little: {
    label: 'Little Kids',
    ages: '3–5',
    emoji: '🧸',
    words: [
      'cat', 'dog', 'sun', 'moon', 'star', 'ball', 'tree', 'fish', 'car', 'hat',
      'apple', 'banana', 'house', 'flower', 'duck', 'egg', 'cake', 'boat', 'bed',
      'cup', 'shoe', 'bird', 'frog', 'heart', 'cloud', 'rain', 'bus', 'pig',
      'cow', 'bee', 'kite', 'sock', 'door', 'bear', 'snail', 'milk', 'eye',
      'nose', 'hand', 'balloon', 'train', 'cookie', 'snowman', 'rainbow',
    ],
  },
  kids: {
    label: 'Kids',
    ages: '6–8',
    emoji: '🎒',
    words: [
      'pizza', 'rocket', 'robot', 'castle', 'dragon', 'pirate', 'unicorn',
      'turtle', 'spider', 'dinosaur', 'guitar', 'bicycle', 'umbrella', 'penguin',
      'octopus', 'volcano', 'rainbow', 'treasure', 'monkey', 'giraffe',
      'elephant', 'butterfly', 'ice cream', 'sandwich', 'airplane', 'tractor',
      'lighthouse', 'mermaid', 'crown', 'ladder', 'kangaroo', 'cupcake',
      'scissors', 'backpack', 'popcorn', 'snake', 'whale', 'igloo', 'ghost',
      'wizard', 'zebra', 'shark', 'tent', 'jellyfish', 'skateboard',
    ],
  },
  big: {
    label: 'Big Kids',
    ages: '9–12',
    emoji: '🚲',
    words: [
      'astronaut', 'skeleton', 'waterfall', 'telescope', 'submarine',
      'helicopter', 'pyramid', 'compass', 'magnet', 'tornado', 'campfire',
      'scarecrow', 'microscope', 'hamburger', 'roller coaster', 'basketball',
      'trampoline', 'parachute', 'chameleon', 'hedgehog', 'library',
      'superhero', 'fireworks', 'snowboard', 'windmill', 'cactus', 'lightning',
      'skyscraper', 'detective', 'piano', 'headphones', 'treehouse', 'goalkeeper',
      'sunflower', 'dentist', 'spaceship', 'earthquake', 'hot air balloon',
      'gingerbread', 'zookeeper', 'sleepover', 'camouflage',
    ],
  },
  teen: {
    label: 'Teens & Adults',
    ages: '13+',
    emoji: '🎓',
    words: [
      'procrastinate', 'gravity', 'evolution', 'democracy', 'nostalgia',
      'traffic jam', 'social media', 'black hole', 'jet lag', 'brainstorm',
      'photosynthesis', 'time travel', 'echo', 'shadow', 'invisible',
      'deadline', 'wifi', 'selfie', 'recycling', 'avalanche', 'eclipse',
      'marathon', 'karaoke', 'quarantine', 'hibernation', 'vacuum cleaner',
      'archaeologist', 'orchestra', 'blueprint', 'constellation', 'yoga',
      'sushi', 'password', 'podcast', 'thunderstorm', 'referee', 'hypnotize',
      'multitasking', 'sunburn', 'déjà vu',
    ],
  },
};

module.exports = { WORDS };
