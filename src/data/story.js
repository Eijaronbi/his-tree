// HIS-TREE story data. All prose is original. Historical claims carry a provenance tag.
// VERIFIED   = supported by primary/strong secondary sources
// INTERPRETED= scholarly reading, presented as one reading among others
// DISPUTED   = sources disagree
// FICTIONAL_CHARACTER / FICTIONALISED_DIALOGUE / ALTERNATE_HISTORY = invented

export const CHARACTERS = {
  timekeeper: {
    name: 'The Timekeeper',
    role: 'Keeper of the Tree',
    born: 'unknown',
    bio: 'Not a person so much as a pressure in the room. It speaks in the second person and never answers a question about itself.',
    provenance: 'FICTIONAL_CHARACTER'
  },
  amina: {
    name: 'Amina bint Yusuf',
    role: 'Apprentice scribe, Walata',
    born: 'c. 1302',
    bio: 'Nineteen, copied her first Qur’an at fourteen, and can tell a bad ink from a good one by smell. She keeps a private list of every book she has handled.',
    provenance: 'FICTIONAL_CHARACTER'
  },
  bakary: {
    name: 'Bakary Traoré',
    role: 'Caravan guide, jeli family',
    born: 'c. 1298',
    bio: 'Reads the sky the way other men read a page. His grandfather guided salt caravans to Taghaza; his father died on the return.',
    provenance: 'FICTIONAL_CHARACTER'
  },
  salim: {
    name: 'Al-Hajj Salim',
    role: 'Scholar of astronomy and law',
    born: 'c. 1262',
    bio: 'Came west from Fez thirty years ago and never left. Believes a library is a machine for arguing with the dead.',
    provenance: 'FICTIONAL_CHARACTER'
  },
  musa: {
    name: 'Mansa Musa',
    role: 'Mansa of Mali',
    born: 'c. 1280',
    bio: 'Ruler of the largest gold-producing state of his age. In 1324 he crossed the Sahara on pilgrimage with a caravan so large that Cairo talked about it for a decade.',
    provenance: 'VERIFIED'
  },
  lincoln: {
    name: 'Abraham Lincoln',
    role: '16th President of the United States',
    born: '12 February 1809',
    bio: 'Six weeks into his second term, at the end of a war that killed more Americans than any other. Tired in a way that sleep does not fix.',
    provenance: 'VERIFIED'
  },
  parker: {
    name: 'John F. Parker',
    role: 'Washington Metropolitan Police, detail to the President',
    born: 'c. 1830',
    bio: 'Assigned to the presidential box at Ford’s Theatre. He had been reprimanded for leaving his post before.',
    provenance: 'VERIFIED'
  },
  booth: {
    name: 'John Wilkes Booth',
    role: 'Actor',
    born: '10 May 1838',
    bio: 'A celebrated Shakespearean and a committed Confederate sympathiser. He had been planning a kidnapping; by April he was planning something else.',
    provenance: 'VERIFIED'
  },
  grant: {
    name: 'Ulysses S. Grant',
    role: 'Commanding General, US Army',
    born: '27 April 1822',
    bio: 'Declined the Lincolns’ invitation to the theatre that night; his wife disliked Mrs Lincoln and wanted to see their children.',
    provenance: 'VERIFIED'
  },
  sergeant: {
    name: 'Sergeant Amos Reed',
    role: '14th US Colored Infantry, 1917',
    born: 'c. 1888',
    bio: 'Two years in the trenches, one letter from home a month, and a firm belief that the Army’s paperwork kills more men than the German artillery.',
    provenance: 'FICTIONAL_CHARACTER'
  },
  miep: {
    name: 'Miep Voss',
    role: 'East Berlin archivist',
    born: '1951',
    bio: 'Has spent eleven years annotating a file cabinet that her ministry insists does not exist.',
    provenance: 'FICTIONAL_CHARACTER'
  }
};

export const CHAPTERS = [
  {
    id: 'mali-1324',
    number: 1,
    title: 'THE GOLDEN EMPIRE',
    era: 'Mali Empire',
    year: '1324 CE',
    place: 'Walata, on the southern edge of the Sahara',
    tagline: 'Every road out of the desert carries something someone will kill for.',
    palette: {
      adobe: 0xb98a5a, adobeDark: 0x8f6539, sand: 0xd9bc8c, wood: 0x6b4527,
      clothRed: 0x8f2f28, clothIndigo: 0x2f4a70, clothOchre: 0xc08a2e,
      sky: 0x8fb4d8, haze: 0xd8bf94, sun: 0xffe0b0
    },
    cinematic: {
      shots: [
        { pos: [0, 30, 62], target: [0, 5, -8], fov: 56, dur: 4.6 },
        { pos: [-9, 3.4, 18], target: [0, 2.6, -6], fov: 43, dur: 4.0 },
        { pos: [5, 2.7, 31], target: [0, 1.5, 22], fov: 40, dur: 3.6 },
        { pos: [0, 8, -28], target: [0, 5.5, -56], fov: 47, dur: 4.2 }
      ]
    },
    post: 'mali',
    lighting: 'highsun',
    intro: [
      { speaker: 'timekeeper', text: 'Walata, 1324. A town built out of the desert because the desert was the road.' },
      { speaker: 'timekeeper', text: 'In a few weeks the Mansa will pass through with a caravan of sixty thousand. Gold, salt, books, and one ledger that decides who eats.' },
      { speaker: 'timekeeper', text: 'Something is about to go missing. Not gold. The thing that makes gold mean anything.' },
      { speaker: 'timekeeper', text: 'You will have five days. Or you will have one, repeated. It depends how you count.' }
    ],
    endingFlag: 'ending',
    history: {
      label: 'No record of this journey survives',
      verifiedKey: null,
      verified: [],
      unrecorded: true
    },
    missions: [
      {
        id: 'salt-ledger',
        title: 'The Salt Ledger',
        brief: 'A trader’s ledger page has vanished from the market quarter. Without it, a widow cannot prove her husband’s debt was paid.',
        steps: [
          { type: 'goto', text: 'Walk to the market quarter', marker: { x: 0, z: 22, r: 6 } },
          { type: 'talk', who: 'amina', dialogue: 'amina_market', text: 'Speak to Amina' },
          { type: 'inspect', target: 'stall', text: 'Search the cloth stall', journal: 'j_salt' },
          { type: 'talk', who: 'bakary', dialogue: 'bakary_ledger', text: 'Ask Bakary who else was on the stall' },
          { type: 'choice', prompt: 'The page is in your hand. It proves Amina’s patron owes nothing.',
            options: [
              { text: 'Return it to the widow, in public.', flags: { ledger: 'public' }, journal: 'j_choice_ledger' },
              { text: 'Give it to the Mansa’s scribe, so the record enters the state archive.', flags: { ledger: 'state' }, journal: 'j_choice_ledger' },
              { text: 'Burn it. A debt that cannot be proven cannot be collected.', flags: { ledger: 'burned' }, journal: 'j_choice_ledger' }
            ] }
        ],
        journal: ['j_salt', 'j_choice_ledger']
      },
      {
        id: 'words-before-water',
        title: 'Words Before Water',
        brief: 'The scholar quarter’s roof failed in the night. Two crates of manuscripts are in the water, and there is time to save one.',
        steps: [
          { type: 'goto', text: 'Get to the scholar quarter', marker: { x: 46, z: -18, r: 7 } },
          { type: 'talk', who: 'salim', dialogue: 'salim_roof', text: 'Speak to Al-Hajj Salim' },
          { type: 'inspect', target: 'crate-a', text: 'Open the astronomy crate', journal: 'j_astro' },
          { type: 'inspect', target: 'crate-b', text: 'Open the medical crate', journal: 'j_med' },
          { type: 'choice', prompt: 'The water is still rising. One crate comes out.',
            options: [
              { text: 'Save the astronomy tables.', flags: { saved: 'astronomy' }, journal: 'j_choice_crates' },
              { text: 'Save the medical compendium.', flags: { saved: 'medicine' }, journal: 'j_choice_crates' },
              { text: 'Save half of each, and lose the middle of both.', flags: { saved: 'neither' }, journal: 'j_choice_crates' }
            ] }
        ],
        journal: ['j_astro', 'j_med', 'j_choice_crates']
      },
      {
        id: 'guides-price',
        title: 'The Guide’s Price',
        brief: 'The caravan needs a guide who will not sell the route. Two are for sale.',
        steps: [
          { type: 'goto', text: 'Go to the caravan camp', marker: { x: -30, z: -40, r: 7 } },
          { type: 'talk', who: 'bakary', dialogue: 'bakary_guide', text: 'Hear Bakary’s price' },
          { type: 'inspect', target: 'camels', text: 'Check the water skins', journal: 'j_water' },
          { type: 'choice', prompt: 'Bakary wants a share of the salt, not coin. The other guide wants coin and no questions.',
            options: [
              { text: 'Hire Bakary. A guide with a stake will not abandon the caravan.', flags: { guide: 'bakary' }, journal: 'j_choice_guide' },
              { text: 'Hire the stranger. Coin is simpler than loyalty.', flags: { guide: 'stranger' }, journal: 'j_choice_guide' }
            ] }
        ],
        journal: ['j_water', 'j_choice_guide']
      },
      {
        id: 'the-gift',
        title: 'A Gift for Cairo',
        brief: 'The Mansa asks what a gift of gold is actually for.',
        steps: [
          { type: 'goto', text: 'Present yourself at the palace gate', marker: { x: 0, z: -62, r: 8 } },
          { type: 'talk', who: 'musa', dialogue: 'musa_gift', text: 'Answer the Mansa' },
          { type: 'choice', prompt: 'He will give away more gold in Cairo than most kings see in a lifetime. How much, and to whom?',
            options: [
              { text: 'Give lavishly, to everyone, so that no one can say Mali is small.', flags: { gift: 'lavish' }, journal: 'j_choice_gift' },
              { text: 'Give to scholars and builders only. Let the gold build something.', flags: { gift: 'builders' }, journal: 'j_choice_gift' },
              { text: 'Give quietly, and let the record say it was less.', flags: { gift: 'quiet' }, journal: 'j_choice_gift' }
            ] }
        ],
        journal: ['j_choice_gift']
      },
      {
        id: 'the-road-remembers',
        title: 'The Road Remembers',
        brief: 'The caravan leaves at first light. So does someone else.',
        steps: [
          { type: 'goto', text: 'Return to the market before dawn', marker: { x: 0, z: 22, r: 6 } },
          { type: 'talk', who: 'amina', dialogue: 'amina_final', text: 'Find Amina' },
          { type: 'choice', prompt: 'A page is missing from the town register. It is the page with your name on it.',
            options: [
              { text: 'Write yourself into the record.', flags: { ending: 'remembered' }, journal: 'j_end_remembered' },
              { text: 'Leave it blank. The road remembers what the paper forgets.', flags: { ending: 'road' }, journal: 'j_end_road' },
              { text: 'Copy the whole register by hand before sunrise.', flags: { ending: 'library' }, journal: 'j_end_library' }
            ] }
        ],
        journal: ['j_end_remembered', 'j_end_road', 'j_end_library']
      }
    ],
    endings: {
      remembered: {
        title: 'THE NAME IN THE MARGIN',
        text: 'The register goes into the caravan’s strongbox with your name in the margin, in Amina’s hand. Two centuries later a Moroccan traveller copies the entry without noticing it does not belong. You are in the record now, and the record is the only thing the desert cannot bury.',
        provenance: 'ALTERNATE_HISTORY'
      },
      road: {
        title: 'THE ROAD REMEMBERS',
        text: 'The page stays blank. Bakary teaches the route to a boy who will teach it to another boy, and the knowledge outlives the paper by three hundred years. Nothing of you survives in any archive. Everything of you survives in the way people walk north.',
        provenance: 'ALTERNATE_HISTORY'
      },
      library: {
        title: 'THE LIBRARY ENDURES',
        text: 'You copy until your hand cramps and the lamp gutters. By sunrise there are two registers. One goes to the Mansa’s archive; one stays in Walata. When the manuscripts burn — and they will burn, twice — a copy is always somewhere else.',
        provenance: 'ALTERNATE_HISTORY'
      }
    }
  },
  {
    id: 'washington-1865',
    number: 2,
    title: 'SAVE LINCOLN',
    era: 'United States',
    year: '14 April 1865',
    place: 'Ford’s Theatre, Washington, D.C.',
    tagline: 'History has a door with no guard on it.',
    palette: {
      adobe: 0x8a6a52, adobeDark: 0x4a3527, sand: 0xb9a58a, wood: 0x5a3a24,
      clothRed: 0x5e1a1c, clothIndigo: 0x25324e, clothOchre: 0xa88a52,
      sky: 0x2a2f3a, haze: 0x3a2f2a, sun: 0xffd9a0
    },
    cinematic: {
      shots: [
        { pos: [-15, 9.5, 15], target: [0, 4, -8], fov: 50, dur: 4.2 },
        { pos: [-2, 6.0, 6.0], target: [4, 3.4, -12], fov: 45, dur: 3.8 },
        { pos: [8, 4.4, 9], target: [10.5, 3.4, -2], fov: 42, dur: 3.8 }
      ]
    },
    post: 'lincoln',
    lighting: 'lamplight',
    intro: [
      { speaker: 'timekeeper', text: 'Washington, the fourteenth of April, 1865. Eight forty in the evening. The war is five days over.' },
      { speaker: 'timekeeper', text: 'The President is in a box at the theatre. The man assigned to guard the door has left it.' },
      { speaker: 'timekeeper', text: 'You have one night. Not a night you can repeat — the Tree will not give you another.' },
      { speaker: 'timekeeper', text: 'Find out what is wrong before the third act. Then decide what you are willing to break.' }
    ],
    endingFlag: 'lincoln',
    history: {
      label: 'Lincoln is shot at Ford’s Theatre',
      verifiedKey: 'lincoln',
      verified: ['unchanged'],
      unrecorded: false
    },
    missions: [
      {
        id: 'the-door',
        title: 'The Door With No Guard',
        brief: 'Walk the theatre and find the gap.',
        steps: [
          { type: 'goto', text: 'Walk the lobby', marker: { x: 0, z: 14, r: 5 } },
          { type: 'inspect', target: 'playbill', text: 'Read the playbill', journal: 'j_playbill' },
          { type: 'goto', text: 'Climb to the dress circle', marker: { x: -12, z: -6, r: 4 } },
          { type: 'inspect', target: 'door', text: 'Examine the corridor door', journal: 'j_door' },
          { type: 'talk', who: 'parker', dialogue: 'parker_absent', text: 'Find the guard' }
        ],
        journal: ['j_playbill', 'j_door']
      },
      {
        id: 'the-missing-guest',
        title: 'The Missing Guest',
        brief: 'The Grants were expected. They are not here. Why?',
        steps: [
          { type: 'inspect', target: 'box', text: 'Look into the presidential box', journal: 'j_box' },
          { type: 'talk', who: 'grant', dialogue: 'grant_declined', text: 'Question the general’s aide' },
          { type: 'inspect', target: 'bar', text: 'Ask at the bar who has been drinking', journal: 'j_bar' }
        ],
        journal: ['j_box', 'j_bar']
      },
      {
        id: 'the-man-in-the-corridor',
        title: 'The Man in the Corridor',
        brief: 'Someone is in the passage who should not be.',
        steps: [
          { type: 'goto', text: 'Follow the corridor behind the dress circle', marker: { x: -22, z: 6, r: 4 } },
          { type: 'inspect', target: 'spur', text: 'Look at what he dropped', journal: 'j_spur' },
          { type: 'talk', who: 'booth', dialogue: 'booth_corridor', text: 'Speak to him' }
        ],
        journal: ['j_spur']
      },
      {
        id: 'the-choice',
        title: 'What You Are Willing to Break',
        brief: 'Nine minutes to the third act.',
        steps: [
          { type: 'goto', text: 'Get to the box door', marker: { x: -22, z: -6, r: 3 } },
          { type: 'choice', prompt: 'The door is unguarded. You have eleven minutes.',
            options: [
              { text: 'Warn the President. Let the plot run, and be ready for it.', flags: { lincoln: 'warned' }, journal: 'j_choice_lincoln' },
              { text: 'Bar the corridor and take the guard’s place yourself.', flags: { lincoln: 'guarded' }, journal: 'j_choice_lincoln' },
              { text: 'Follow Booth. Stop the man, not the moment.', flags: { lincoln: 'chased' }, journal: 'j_choice_lincoln' },
              { text: 'Do nothing. Some things must happen as they happened.', flags: { lincoln: 'unchanged' }, journal: 'j_choice_lincoln' }
            ] }
        ],
        journal: ['j_choice_lincoln']
      }
    ],
    endings: {
      warned: {
        title: 'THE THIRD ACT',
        text: 'Lincoln turns his head. The shot goes into the wall behind him and the theatre becomes a stampede. He survives the night, the month, the term. Reconstruction is not softer for it; it is simply longer, and the wound stays open for another generation.',
        provenance: 'ALTERNATE_HISTORY'
      },
      guarded: {
        title: 'THE MAN WHO STOOD AT THE DOOR',
        text: 'Booth finds the door held from the inside. He curses, improvises, and is taken in the alley with a knife he never used. The trial lasts a year and poisons the country. Lincoln serves out his term and dies in bed, in 1870, of a stroke, in a country that never stops arguing about him.',
        provenance: 'ALTERNATE_HISTORY'
      },
      chased: {
        title: 'THE MAN IN THE CORRIDOR',
        text: 'You catch his sleeve. He is stronger than an actor should be. In the noise nobody hears the scuffle, and by the time the curtain falls the President is alive and the corridor is empty. You do not know, for the rest of your life, whether you changed anything or only moved it.',
        provenance: 'ALTERNATE_HISTORY'
      },
      unchanged: {
        title: 'THE FOURTEENTH OF APRIL',
        text: 'You stand in the corridor and let the minutes pass. At 10:15 the President is carried across the street to a boarding house. He dies at 7:22 the next morning. The Tree does not thank you. It only records that you were there, and that you understood what it costs to leave history alone.',
        provenance: 'VERIFIED'
      }
    }
  },
  {
    id: 'france-1917',
    number: 3,
    title: 'THE QUIET MUTINY',
    era: 'First World War',
    year: '1917',
    place: 'A supply trench behind the Chemin des Dames',
    tagline: 'The paperwork is the weapon.',
    palette: {
      adobe: 0x6a6a5c, adobeDark: 0x3b3b32, sand: 0x7a7360, wood: 0x4a3524,
      clothRed: 0x6b3a2a, clothIndigo: 0x2a3440, clothOchre: 0x8a7a4a,
      sky: 0x8a949c, haze: 0x9aa0a0, sun: 0xdfe6ea
    },
    cinematic: {
      shots: [
        { pos: [0, 2.4, 14], target: [0, 1.2, -6], fov: 46, dur: 4.0 },
        { pos: [7, 2.0, 2], target: [-8, 1.4, -3], fov: 43, dur: 4.0 },
        { pos: [-4, 3.4, 10], target: [2, 1.0, -10], fov: 48, dur: 3.6 }
      ]
    },
    post: 'mud',
    lighting: 'overcast',
    intro: [
      { speaker: 'timekeeper', text: 'Chemin des Dames, 1917. The offensive has failed. The men have been told it has not.' },
      { speaker: 'timekeeper', text: 'Two hundred soldiers are refusing to leave the line. Not because they are cowards. Because the order is written wrong.' },
      { speaker: 'timekeeper', text: 'Find the clerk who wrote it. Before the military police find the men.' }
    ],
    endingFlag: 'mutiny',
    history: {
      label: 'The mutiny is broken and the offensive continues',
      verifiedKey: 'mutiny',
      verified: [],
      unrecorded: false
    },
    missions: [
      {
        id: 'the-order',
        title: 'The Order',
        brief: 'A unit has refused an attack order that contradicts the corps timetable.',
        steps: [
          { type: 'goto', text: 'Walk the reserve trench', marker: { x: 0, z: 18, r: 6 } },
          { type: 'talk', who: 'sergeant', dialogue: 'sgt_order', text: 'Speak to Sergeant Reed' },
          { type: 'inspect', target: 'papers', text: 'Read the order', journal: 'j_order' },
          { type: 'goto', text: 'Reach the signals dugout', marker: { x: -26, z: -14, r: 5 } },
          { type: 'inspect', target: 'logbook', text: 'Check the signals log', journal: 'j_logbook' },
          { type: 'choice', prompt: 'The order was typed from a misheard telephone message. You can prove it.',
            options: [
              { text: 'Send the correction up the line.', flags: { mutiny: 'corrected' }, journal: 'j_choice_mutiny' },
              { text: 'Destroy the wrong order and let the men be blamed.', flags: { mutiny: 'blamed' }, journal: 'j_choice_mutiny' },
              { text: 'Give the men the proof and let them decide.', flags: { mutiny: 'informed' }, journal: 'j_choice_mutiny' }
            ] }
        ],
        journal: ['j_order', 'j_logbook', 'j_choice_mutiny']
      }
    ],
    endings: {
      corrected: { title: 'THE CORRECTION', text: 'The attack goes in two hours late and half-strength, which is to say it fails more slowly. One hundred and nine men live who would not have. Nobody records why.', provenance: 'ALTERNATE_HISTORY' },
      blamed: { title: 'THE EXAMPLE', text: 'Six men are shot for cowardice in a courtyard that still exists. The clerk is promoted. The Tree records the name of every man in the file, because nobody else did.', provenance: 'ALTERNATE_HISTORY' },
      informed: { title: 'THE MUTINY', text: 'The men march to the rear with the wrong order in their hands, and the army cannot shoot a document. The line holds. The war does not end any sooner.', provenance: 'ALTERNATE_HISTORY' }
    }
  },
  {
    id: 'berlin-1989',
    number: 4,
    title: 'THE FILE THAT DOESN’T EXIST',
    era: 'Cold War',
    year: '9 November 1989',
    place: 'A ministry archive, East Berlin',
    tagline: 'Everything is true until the building falls down.',
    palette: {
      adobe: 0x8a8578, adobeDark: 0x4a4640, sand: 0x9a958a, wood: 0x6a5238,
      clothRed: 0x8a2a24, clothIndigo: 0x2a3a52, clothOchre: 0x9a8a5a,
      sky: 0x6a7686, haze: 0x7a8090, sun: 0xd8d0c0
    },
    cinematic: {
      shots: [
        { pos: [0, 3.0, 12], target: [0, 1.6, -6], fov: 46, dur: 4.0 },
        { pos: [-6, 2.2, 4], target: [6, 1.6, -4], fov: 44, dur: 3.8 }
      ]
    },
    post: 'cold',
    lighting: 'fluorescent',
    intro: [
      { speaker: 'timekeeper', text: 'East Berlin, 9 November 1989. A press conference is running late and a man is reading a note he does not understand.' },
      { speaker: 'timekeeper', text: 'In an archive three streets away, a woman is deciding which files to burn and which to carry.' },
      { speaker: 'timekeeper', text: 'One of those files contains a name that should not be in it. Yours.' }
    ],
    endingFlag: 'file',
    history: {
      label: 'The wall opens on the ninth of November',
      verifiedKey: 'file',
      verified: [],
      unrecorded: false
    },
    missions: [
      {
        id: 'the-archive',
        title: 'The Archive',
        brief: 'The wall is opening. The paper is not.',
        steps: [
          { type: 'goto', text: 'Enter the archive', marker: { x: 0, z: 12, r: 5 } },
          { type: 'talk', who: 'miep', dialogue: 'miep_archive', text: 'Speak to Miep' },
          { type: 'inspect', target: 'cabinet', text: 'Open the cabinet', journal: 'j_cabinet' },
          { type: 'choice', prompt: 'The shredder is loud. The crowd outside is louder.',
            options: [
              { text: 'Take the file. Let the rest burn.', flags: { file: 'taken' }, journal: 'j_choice_file' },
              { text: 'Save the whole cabinet. It will take both of you.', flags: { file: 'saved' }, journal: 'j_choice_file' },
              { text: 'Burn it all. Some records are also cages.', flags: { file: 'burned' }, journal: 'j_choice_file' }
            ] }
        ],
        journal: ['j_cabinet', 'j_choice_file']
      }
    ],
    endings: {
      taken: { title: 'THE NARROW FILE', text: 'You walk out with one folder under your coat and the street full of people who have never seen the inside of that building. The file survives. The rest is pulp by morning.', provenance: 'ALTERNATE_HISTORY' },
      saved: { title: 'THE WHOLE CABINET', text: 'You carry it four blocks. Your hands are ruined. Thirty years later a historian finds a name in it that does not appear anywhere else, and writes a book about a person who was not supposed to exist.', provenance: 'ALTERNATE_HISTORY' },
      burned: { title: 'THE CLEAN AIR', text: 'The shredder and the furnace and the crowd all make the same sound. In the morning nothing is left but the smell, and for one family that is the same as being free.', provenance: 'ALTERNATE_HISTORY' }
    }
  }
];

export const DIALOGUE = {
  amina_market: [
    { speaker: 'amina', text: 'You are the one the Tree sent. Good. I have three hours and a widow who cannot read.' },
    { speaker: 'amina', text: 'Her husband paid his salt debt in cloth. The page that says so was on that stall last night. Now it is not.' },
    { speaker: 'amina', text: 'Everyone in this market can tell you who took it. Nobody will, because whoever took it can also stop selling them salt.' }
  ],
  bakary_ledger: [
    { speaker: 'bakary', text: 'The page? I saw a man with a scribe’s satchel put his hand under the cloth.' },
    { speaker: 'bakary', text: 'A satchel does not mean a scribe. Half this town can write. That is the trouble with a place that respects learning.' },
    { speaker: 'bakary', text: 'It is in the crate behind the indigo. Do not ask me how I know.' }
  ],
  salim_roof: [
    { speaker: 'salim', text: 'Two crates. One is Ptolemy corrected by a man in Toledo. One is a physician’s notes on fevers.' },
    { speaker: 'salim', text: 'Do not tell me which is more valuable. Tell me which one you would save, and I will know what kind of person the Tree has sent me.' },
    { speaker: 'salim', text: 'Also: the water is at my ankles and I am sixty-two years old. Hurry.' }
  ],
  bakary_guide: [
    { speaker: 'bakary', text: 'I will take you to Taghaza and back. I want one share of the salt, not coin.' },
    { speaker: 'bakary', text: 'Coin is worth what the town says it is worth. Salt is worth what a man dying of thirst says it is worth.' },
    { speaker: 'bakary', text: 'The other guide will take your coin and leave you at the second well. He has done it before. I know because I found the man he left.' }
  ],
  musa_gift: [
    { speaker: 'musa', text: 'They will say in Cairo that Mali has more gold than sense.' },
    { speaker: 'musa', text: 'I could give nothing and be called wise. I could give everything and be called a fool. Both stories travel. Which one should travel?' },
    { speaker: 'musa', text: 'Do not tell me what is generous. Tell me what will still be there in a hundred years.' }
  ],
  amina_final: [
    { speaker: 'amina', text: 'The register is missing a page. I checked twice.' },
    { speaker: 'amina', text: 'You could put yourself in it. Or you could leave it and trust the road.' },
    { speaker: 'amina', text: 'I have copied four hundred pages this year. I know what paper is for. I am less sure what people are for.' }
  ],
  parker_absent: [
    { speaker: 'parker', text: 'I stepped out. A drink, that is all. The box was locked.' },
    { speaker: 'parker', text: 'You want to know if I was at my post. I was not. Write it down if you like; they have written it before.' },
    { speaker: 'parker', text: 'Nothing happens in a theatre except a play.' }
  ],
  grant_declined: [
    { speaker: 'grant', text: 'We were invited. Julia would not come; she cannot abide Mrs Lincoln.' },
    { speaker: 'grant', text: 'So the box is the President and his wife and a young officer’s wife. And a guard who is not standing where a guard should stand.' },
    { speaker: 'grant', text: 'I am a general, not a nursemaid. But I have been in rooms where the door mattered.' }
  ],
  booth_corridor: [
    { speaker: 'booth', text: 'You know me. Everyone knows me. I have played Brutus in this city.' },
    { speaker: 'booth', text: 'Do you know what Brutus was? A patriot with a knife and a bad plan.' },
    { speaker: 'booth', text: 'The President is in a box with a door that does not lock from the outside. I would call that a design flaw. Wouldn’t you?' }
  ],
  sgt_order: [
    { speaker: 'sergeant', text: 'The order says we go over at zero five hundred. The corps timetable says the artillery lifts at zero six.' },
    { speaker: 'sergeant', text: 'So we walk into our own barrage. I have done the arithmetic. So have the men.' },
    { speaker: 'sergeant', text: 'They will call it cowardice. It is a typing error.' }
  ],
  miep_archive: [
    { speaker: 'miep', text: 'You are early. The wall is not open yet; it opens in an hour, and then it never closes.' },
    { speaker: 'miep', text: 'This cabinet is full of people who informed on their neighbours. Some of them are in the crowd outside, shouting for freedom.' },
    { speaker: 'miep', text: 'I am not asking you to decide who is guilty. I am asking you what a country should be allowed to forget.' }
  ],
  timekeeper_rewrite: [
    { speaker: 'timekeeper', text: 'You have changed the branch. The Tree does not judge. It only grows.' },
    { speaker: 'timekeeper', text: 'Look at the journal. Everything you were told tonight is tagged: what is known, what is argued, what is invented. Do not confuse them.' }
  ]
};

export const JOURNAL = {
  j_salt: {
    title: 'Salt, gold, and trust',
    body: 'In the western Sudan, salt from the Saharan mines at Taghaza was cut into slabs and traded south; gold moved north. Neither metal had a fixed price — what made the trade work was credit: a merchant’s word, witnessed and written down. A ledger page was therefore not paperwork. It was property.',
    provenance: 'INTERPRETED',
    sources: 'al-Bakri (11th c.), Ibn Battuta’s Rihla (1352–53), al-Umari’s account of Mansa Musa’s visit (c. 1337)'
  },
  j_choice_ledger: {
    title: 'Who owns a record',
    body: 'You have just decided whether a debt belongs to the person who owes it, the state that records it, or nobody at all. Historians of Mali read the same archives very differently: as evidence of a commercial economy, or as the paperwork of a ruling class extracting surplus. Both readings are in the sources.',
    provenance: 'DISPUTED',
    sources: 'al-Umari; Ibn Khaldun, Kitab al-‘Ibar'
  },
  j_astro: {
    title: 'Astronomy in the western Sudan',
    body: 'The crate holds tables for the motion of the moon and a commentary on Ptolemy that has travelled from Toledo to Cairo to Walata. Manuscripts moved along the same roads as salt, and survived because somebody copied them.',
    provenance: 'INTERPRETED',
    sources: 'Timbuktu manuscript collections (16th–19th c. survivals); al-Sahili’s reputation at Musa’s court'
  },
  j_med: {
    title: 'A physician’s notes',
    body: 'Fevers, wounds, and the uses of a plant the writer calls “the bitter leaf”. Medical knowledge in this period travelled with pilgrims, merchants, and enslaved people, and was written down in Arabic by scholars who often credited earlier authorities rather than themselves.',
    provenance: 'INTERPRETED',
    sources: 'Arabic medical compendia circulating in the Maghreb and Sudan; later Timbuktu medical manuscripts'
  },
  j_choice_crates: {
    title: 'The cost of a choice',
    body: 'You saved one crate. In the alternate branch you chose, the other is lost. This is the chapter’s argument: knowledge survives by redundancy, not by value. Libraries die when there is only one copy — which is why the real history of Timbuktu’s manuscripts is a history of copying, hiding, and smuggling.',
    provenance: 'INTERPRETED',
    sources: 'Timbuktu manuscript preservation efforts, 1990s–2012'
  },
  j_water: {
    title: 'Crossing the Sahara',
    body: 'Caravans crossed at night and rested by day, navigating by stars and by remembered landmarks. Water was carried in skins; the guide’s authority was absolute because a wrong turn was a death sentence for everyone. Camels could go days without water; people could not.',
    provenance: 'VERIFIED',
    sources: 'Ibn Battuta’s Rihla; al-Bakri; later European travellers’ accounts'
  },
  j_choice_guide: {
    title: 'Loyalty as infrastructure',
    body: 'A guide paid in salt had a stake in the cargo. A guide paid in coin had a stake in the payment. This is the chapter’s second argument: institutions are made of incentives long before they are made of laws.',
    provenance: 'INTERPRETED'
  },
  j_choice_gift: {
    title: 'The gold of Cairo',
    body: 'Musa’s pilgrimage of 1324–25 passed through Cairo, where he distributed gold so freely that its value reportedly fell for years afterwards. The story reached Europe through Catalan and Italian mapmakers; by 1375 the Catalan Atlas showed a crowned Malian king holding a gold nugget.',
    provenance: 'VERIFIED',
    sources: 'al-Umari (writing c. 1337, from Cairo informants); Catalan Atlas (1375)'
  },
  j_end_remembered: { title: 'The name in the margin', body: 'You wrote yourself into the register. History is full of people who did exactly this, and full of people who were written out of it. The margin is where most of them survive.', provenance: 'ALTERNATE_HISTORY' },
  j_end_road: { title: 'The road remembers', body: 'No document carries your name. The route does. Knowledge that is walked is not the same as knowledge that is written, but it lasts on a different clock.', provenance: 'ALTERNATE_HISTORY' },
  j_end_library: { title: 'The library endures', body: 'Two copies. One archive, one town. Redundancy is the only technology that has ever preserved anything.', provenance: 'ALTERNATE_HISTORY' },
  j_playbill: {
    title: 'Our American Cousin',
    body: 'Ford’s Theatre, 14 April 1865. The evening’s performance was a popular comedy. The President was expected in the state box with General Grant; the Grants declined and left for New Jersey.',
    provenance: 'VERIFIED',
    sources: 'Contemporary playbills and newspaper notices; Grant’s memoirs'
  },
  j_door: {
    title: 'The door that would not lock',
    body: 'The presidential box at Ford’s had a door that could be held shut only from inside, and a corridor door that was supposed to be guarded. The officer assigned, John F. Parker of the Metropolitan Police, left his post. He had been reprimanded for a similar absence earlier in the year.',
    provenance: 'VERIFIED',
    sources: 'US Congress investigation (1866); Metropolitan Police records'
  },
  j_box: {
    title: 'The state box',
    body: 'Two flags decorated the box that night. The President sat in a rocking chair at the front right, his wife beside him, a young officer’s fiancée to the left. The box had been prepared for a general who did not come.',
    provenance: 'VERIFIED'
  },
  j_bar: {
    title: 'The man at the bar',
    body: 'Booth was a familiar figure in the theatre and had been drinking in the saloon next door. Staff remembered him because actors are remembered. Nobody remembered him as a threat, because he was famous for being on the stage, not behind it.',
    provenance: 'VERIFIED'
  },
  j_spur: {
    title: 'A spur on the floor',
    body: 'Booth’s boot spur caught on the flag bunting as he jumped from the box. He broke his leg below the knee — a detail that later helped fix the timeline of his escape, and that he complained about more than the murder.',
    provenance: 'VERIFIED'
  },
  j_choice_lincoln: {
    title: 'The cost of an intervention',
    body: 'Historians argue about counterfactuals for a reason: Lincoln’s survival would not automatically have produced a gentler Reconstruction. Congress, the Army, and the states had their own momentum. Saving one man is not the same as saving a policy.',
    provenance: 'DISPUTED'
  },
  j_order: {
    title: 'The order and the timetable',
    body: 'First World War attacks were choreographed to the minute: artillery lifts, infantry advances, rolling barrages. An order that contradicted the corps timetable would have walked men into their own shellfire. Such errors happened — often through misheard telephone messages and retyped orders.',
    provenance: 'INTERPRETED',
    sources: 'Unit war diaries; British and French staff instructions, 1916–17'
  },
  j_logbook: {
    title: 'The signals log',
    body: 'Signals logs recorded every message by time and originator. They are among the most reliable documents of the war, precisely because they were written by clerks who had no idea what the messages meant.',
    provenance: 'VERIFIED'
  },
  j_choice_mutiny: {
    title: 'Mutiny and the army',
    body: 'In 1917 the French army was convulsed by mutinies after the Nivelle offensive — tens of thousands of men refused to attack, while insisting they would still defend. Around six hundred were tried, and dozens executed. The distinction between refusing to attack and refusing to serve mattered enormously.',
    provenance: 'VERIFIED',
    sources: 'French military archives; Guy Pedroncini’s study of the 1917 mutinies'
  },
  j_cabinet: {
    title: 'The Stasi files',
    body: 'The Ministry for State Security kept files on millions of East Germans, including informers’ reports on neighbours, colleagues, and family. When the Wall opened, citizens stormed the offices — partly to stop the shredding, partly to read what had been written about them.',
    provenance: 'VERIFIED'
  },
  j_choice_file: {
    title: 'What a country may forget',
    body: 'The Stasi records were eventually preserved by a citizens’ movement and opened by law. The argument you just made is still being made: whether an archive is a tool of justice, a machine for reopening wounds, or both.',
    provenance: 'DISPUTED'
  }
};

export const HUB = {
  title: 'HIS-TREE',
  subtitle: 'Experience History. Rewrite Destiny.',
  blurb: 'Six moments. One tree. Every branch you take is recorded — and tagged, so you always know what is known and what you invented.',
  chapters: CHAPTERS.map((c) => ({ id: c.id, number: c.number, title: c.title, era: c.era, year: c.year, place: c.place, tagline: c.tagline }))
};
