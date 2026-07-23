import { getDb } from './db'
import { songs, artists, albums, movies } from './schema'
import crypto from 'crypto'

export async function seedCatalog() {
  const db = getDb()

  // Only seed if songs table is empty
  const existingCount = db.select().from(songs).all().length
  if (existingCount > 0) return

  console.log('Seeding initial verified Bollywood catalog across multiple decades (1970s-2020s)...')

  const realMovies = [
    // 1970s
    {
      title: 'Sholay',
      year: 1975,
      director: 'Ramesh Sippy',
      cast: ['Amitabh Bachchan', 'Dharmendra', 'Hema Malini', 'Jaya Bachchan'],
      songs: [
        { title: 'Yeh Dosti Hum Nahin Todenge', singers: ['Kishore Kumar', 'Manna Dey'], lyricist: 'Anand Bakshi', duration: 321, genre: 'Classic', moods: ['Joyful', 'Optimistic'], popularity: 98 },
        { title: 'Mehbooba Mehbooba', singers: ['R. D. Burman'], lyricist: 'Anand Bakshi', duration: 234, genre: 'Dance', moods: ['Party', 'Vibrant'], popularity: 93 }
      ],
      composers: ['R. D. Burman']
    },
    // 1980s
    {
      title: 'Qayamat Se Qayamat Tak',
      year: 1988,
      director: 'Mansoor Khan',
      cast: ['Aamir Khan', 'Juhi Chawla'],
      songs: [
        { title: 'Papa Kehte Hain', singers: ['Udit Narayan'], lyricist: 'Majrooh Sultanpuri', duration: 355, genre: 'Pop', moods: ['Hopeful', 'Free-spirited'], popularity: 96 },
        { title: 'Ae Mere Humsafar', singers: ['Udit Narayan', 'Alka Yagnik'], lyricist: 'Majrooh Sultanpuri', duration: 338, genre: 'Romantic', moods: ['Dreamy'], popularity: 94 }
      ],
      composers: ['Anand-Milind']
    },
    // 1990s
    {
      title: 'Dilwale Dulhania Le Jayenge',
      year: 1995,
      director: 'Aditya Chopra',
      cast: ['Shah Rukh Khan', 'Kajol', 'Amrish Puri'],
      songs: [
        { title: 'Tujhe Dekha To', singers: ['Lata Mangeshkar', 'Kumar Sanu'], lyricist: 'Anand Bakshi', duration: 302, genre: 'Romantic', moods: ['Happy', 'Emotional'], popularity: 98 },
        { title: 'Mehndi Laga Ke Rakhna', singers: ['Lata Mangeshkar', 'Udit Narayan'], lyricist: 'Anand Bakshi', duration: 287, genre: 'Wedding', moods: ['Party', 'Energetic'], popularity: 95 },
        { title: 'Ruk Ja O Dil Deewane', singers: ['Udit Narayan'], lyricist: 'Anand Bakshi', duration: 314, genre: 'Dance', moods: ['Playful', 'Energetic'], popularity: 90 },
        { title: 'Ho Gaya Hai Tujhko To Pyar Sajna', singers: ['Lata Mangeshkar', 'Udit Narayan'], lyricist: 'Anand Bakshi', duration: 349, genre: 'Romantic', moods: ['Emotional', 'Dreamy'], popularity: 92 }
      ],
      composers: ['Jatin-Lalit']
    },
    {
      title: 'Kuch Kuch Hota Hai',
      year: 1998,
      director: 'Karan Johar',
      cast: ['Shah Rukh Khan', 'Kajol', 'Rani Mukerji'],
      songs: [
        { title: 'Kuch Kuch Hota Hai', singers: ['Udit Narayan', 'Alka Yagnik'], lyricist: 'Sameer', duration: 296, genre: 'Romantic', moods: ['Happy', 'Dreamy'], popularity: 97 },
        { title: 'Koi Mil Gaya', singers: ['Udit Narayan', 'Alka Yagnik', 'Kavita Krishnamurthy'], lyricist: 'Sameer', duration: 436, genre: 'Dance', moods: ['Playful', 'Energetic'], popularity: 91 },
        { title: 'Ladki Badi Anjana Hai', singers: ['Kumar Sanu', 'Alka Yagnik'], lyricist: 'Sameer', duration: 373, genre: 'Dance', moods: ['Happy', 'Playful'], popularity: 93 },
        { title: 'Tujhe Yaad Na Meri Aayee', singers: ['Alka Yagnik', 'Manpreet Akhtar', 'Udit Narayan'], lyricist: 'Sameer', duration: 426, genre: 'Sad', moods: ['Heartbroken', 'Emotional'], popularity: 94 }
      ],
      composers: ['Jatin-Lalit']
    },
    // 2000s
    {
      title: 'Kabhi Khushi Kabhie Gham',
      year: 2001,
      director: 'Karan Johar',
      cast: ['Shah Rukh Khan', 'Kajol', 'Amitabh Bachchan', 'Jaya Bachchan', 'Hrithik Roshan', 'Kareena Kapoor'],
      songs: [
        { title: 'Kabhi Khushi Kabhie Gham', singers: ['Lata Mangeshkar'], lyricist: 'Sameer', duration: 450, genre: 'Devotional', moods: ['Emotional', 'Solemn'], popularity: 94 },
        { title: 'Bole Chudiyan', singers: ['Alka Yagnik', 'Kavita Krishnamurthy', 'Udit Narayan', 'Amit Kumar', 'Sonu Nigam'], lyricist: 'Sameer', duration: 408, genre: 'Dance', moods: ['Festive', 'Energetic'], popularity: 99 },
        { title: 'Suraj Hua Maddham', singers: ['Alka Yagnik', 'Sonu Nigam'], lyricist: 'Anil Pandey', duration: 427, genre: 'Romantic', moods: ['Dreamy', 'Emotional'], popularity: 98 },
        { title: 'You Are My Soniya', singers: ['Alka Yagnik', 'Sonu Nigam'], lyricist: 'Sameer', duration: 345, genre: 'Pop', moods: ['Party', 'Energetic'], popularity: 89 }
      ],
      composers: ['Jatin-Lalit', 'Sandesh Shandilya']
    },
    {
      title: 'Dil Chahta Hai',
      year: 2001,
      director: 'Farhan Akhtar',
      cast: ['Aamir Khan', 'Saif Ali Khan', 'Akshaye Khanna', 'Preity Zinta'],
      songs: [
        { title: 'Dil Chahta Hai', singers: ['Shankar Mahadevan'], lyricist: 'Javed Akhtar', duration: 311, genre: 'Rock', moods: ['Optimistic', 'Free-spirited'], popularity: 95 },
        { title: 'Jaane Kyun', singers: ['Udit Narayan', 'Alka Yagnik'], lyricist: 'Javed Akhtar', duration: 289, genre: 'Pop', moods: ['Playful', 'Happy'], popularity: 92 },
        { title: 'Tanhayee', singers: ['Sonu Nigam'], lyricist: 'Javed Akhtar', duration: 370, genre: 'Sad', moods: ['Melancholic', 'Heartbroken'], popularity: 96 }
      ],
      composers: ['Shankar-Ehsaan-Loy']
    },
    {
      title: 'Kal Ho Naa Ho',
      year: 2003,
      director: 'Nikhil Advani',
      cast: ['Shah Rukh Khan', 'Preity Zinta', 'Saif Ali Khan'],
      songs: [
        { title: 'Kal Ho Naa Ho', singers: ['Sonu Nigam'], lyricist: 'Javed Akhtar', duration: 321, genre: 'Romantic', moods: ['Emotional', 'Hopeful'], popularity: 99 },
        { title: 'Maahi Ve', singers: ['Udit Narayan', 'Madhushree', 'Alka Yagnik', 'Sonu Nigam', 'Shankar Mahadevan'], lyricist: 'Javed Akhtar', duration: 367, genre: 'Wedding', moods: ['Joyful', 'Festive'], popularity: 96 },
        { title: 'It\'s The Time To Disco', singers: ['Vasundhara Das', 'KK', 'Shaan', 'Loy Mendonsa'], lyricist: 'Javed Akhtar', duration: 335, genre: 'Dance', moods: ['Party', 'Vibrant'], popularity: 90 }
      ],
      composers: ['Shankar-Ehsaan-Loy']
    },
    {
      title: 'Jab We Met',
      year: 2007,
      director: 'Imtiaz Ali',
      cast: ['Shahid Kapoor', 'Kareena Kapoor'],
      songs: [
        { title: 'Mauja Hi Mauja', singers: ['Mika Singh'], lyricist: 'Irshad Kamil', duration: 244, genre: 'Bhangra', moods: ['Party', 'Ecstatic'], popularity: 95 },
        { title: 'Tum Se Hi', singers: ['Mohit Chauhan'], lyricist: 'Irshad Kamil', duration: 321, genre: 'Acoustic', moods: ['Romantic', 'Relaxed'], popularity: 98 },
        { title: 'Yeh Ishq Hai', singers: ['Shreya Ghoshal'], lyricist: 'Irshad Kamil', duration: 284, genre: 'Dance', moods: ['Cheerful', 'Energetic'], popularity: 94 }
      ],
      composers: ['Pritam']
    },
    // 2010s
    {
      title: 'Aashiqui 2',
      year: 2013,
      director: 'Mohit Suri',
      cast: ['Aditya Roy Kapur', 'Shraddha Kapoor'],
      songs: [
        { title: 'Tum Hi Ho', singers: ['Arijit Singh'], lyricist: 'Mithoon', duration: 262, genre: 'Romantic', moods: ['Intense', 'Dreamy'], popularity: 99 },
        { title: 'Sunn Raha Hai', singers: ['Ankit Tiwari'], lyricist: 'Sandeep Nath', duration: 314, genre: 'Sad', moods: ['Emotional'], popularity: 95 }
      ],
      composers: ['Mithoon', 'Ankit Tiwari', 'Jeet Gannguli']
    },
    // 2020s
    {
      title: 'Shershaah',
      year: 2021,
      director: 'Vishnuvardhan',
      cast: ['Sidharth Malhotra', 'Kiara Advani'],
      songs: [
        { title: 'Raataan Lambiyan', singers: ['Jubin Nautiyal', 'Asees Kaur'], lyricist: 'Tanishk Bagchi', duration: 230, genre: 'Romantic', moods: ['Dreamy', 'Relaxed'], popularity: 98 },
        { title: 'Ranjha', singers: ['B Praak', 'Jasleen Royal'], lyricist: 'Anvita Dutt', duration: 228, genre: 'Sad', moods: ['Emotional'], popularity: 96 }
      ],
      composers: ['Tanishk Bagchi', 'B Praak', 'Jasleen Royal']
    }
  ]

  for (const m of realMovies) {
    const movieId = crypto.createHash('md5').update(m.title).digest('hex')
    
    // Insert Movie
    await db.insert(movies).values({
      id: movieId,
      title: m.title,
      year: m.year,
      director: m.director,
      castJson: JSON.stringify(m.cast),
      poster: '',
      favorite: 0
    }).onConflictDoNothing()

    // Insert Album
    const albumId = crypto.createHash('md5').update(m.title + ' Soundtracks').digest('hex')
    await db.insert(albums).values({
      id: albumId,
      title: m.title,
      artist: m.composers.join(', '),
      year: m.year,
      cover: '',
      favorite: 0
    }).onConflictDoNothing()

    for (const s of m.songs) {
      const songId = crypto.createHash('md5').update(m.title + s.title).digest('hex')

      // Insert Artists
      for (const singer of s.singers) {
        const singerId = crypto.createHash('md5').update(singer).digest('hex')
        await db.insert(artists).values({
          id: singerId,
          name: singer,
          image: '',
          bio: `Playback singer in Bollywood movies. Active during golden musical eras.`,
          popularity: 90,
          favorite: 0
        }).onConflictDoNothing()
      }

      // Decade calculation
      const decade = `${Math.floor(m.year / 10) * 10}s`

      // Save Song Record
      await db.insert(songs).values({
        id: songId,
        title: s.title,
        artist: s.singers[0],
        album: m.title,
        genre: s.genre,
        year: m.year,
        composer: m.composers[0],
        lyrics: '',
        duration: s.duration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Catalog Fields
        movie: m.title,
        decade,
        artistsJson: JSON.stringify(s.singers),
        composersJson: JSON.stringify(m.composers),
        lyricistsJson: JSON.stringify([s.lyricist]),
        genresJson: JSON.stringify([s.genre]),
        moodsJson: JSON.stringify(s.moods),
        popularity: s.popularity,
        tagsJson: JSON.stringify([s.genre, ...s.moods]),
        searchKeywordsJson: JSON.stringify([s.title, m.title, ...s.singers, ...m.composers]),
        youtubeQuery: `${s.title} ${m.title} official song`,
        downloaded: 0,
        favorite: 0,
        playCount: 0
      }).onConflictDoNothing()
    }
  }

  console.log('Seeded verified Bollywood catalog successfully across multiple decades!')
}

/**
 * Generate 100,000 synthetic records covering six decades (1970s - 2020s)
 */
export async function generatePerformanceTestData(count = 100000) {
  const db = getDb()
  console.log(`Generating ${count} Bollywood catalog performance records...`)

  const mockFirstNames = ['Raj', 'Rahul', 'Amit', 'Vikram', 'Samir', 'Arjun', 'Simran', 'Anjali', 'Priya', 'Karan']
  const mockSecondNames = ['Prem', 'Tum', 'Dil', 'Pyar', 'Ishq', 'Hum', 'Zindagi', 'Sanam', 'Dhadkan', 'Sath']
  const mockSuffixes = ['Ke Liye', 'Mere Yaar', 'Sajna', 'Har Pal', 'Hamesha', 'Se Hi', 'Aise Hi', 'Tum Mile']

  const mockSingers = ['Sonu Nigam', 'Udit Narayan', 'Alka Yagnik', 'Kumar Sanu', 'Shreya Ghoshal', 'Kavita Krishnamurthy', 'Sunidhi Chauhan', 'KK', 'Shaan', 'Hariharan', 'Kishore Kumar', 'Arijit Singh']
  const mockComposers = ['A. R. Rahman', 'Jatin-Lalit', 'Anu Malik', 'Shankar-Ehsaan-Loy', 'Pritam', 'Nadeem-Shravan', 'Rajesh Roshan', 'R. D. Burman', 'Tanishk Bagchi']
  const mockLyricists = ['Javed Akhtar', 'Gulzar', 'Sameer', 'Anand Bakshi', 'Irshad Kamil', 'Prasoon Joshi']
  const mockGenres = ['Romantic', 'Sad', 'Dance', 'Wedding', 'Sufi', 'Ghazal', 'Pop', 'Indie', 'Classic']
  const mockMoods = ['Dreamy', 'Emotional', 'Melancholic', 'Party', 'Vibrant', 'Playful', 'Spiritual', 'Joyful']

  const mockMovieTitles: string[] = []
  for (let i = 0; i < 500; i++) {
    mockMovieTitles.push(`Bollywood Movie Vol ${i}`)
  }

  const batchSize = 10000
  let inserted = 0

  while (inserted < count) {
    const batch = []
    const limit = Math.min(batchSize, count - inserted)

    for (let i = 0; i < limit; i++) {
      const idx = inserted + i
      const title = `${mockFirstNames[idx % mockFirstNames.length]} ${mockSecondNames[(idx >> 1) % mockSecondNames.length]} ${mockSuffixes[(idx >> 2) % mockSuffixes.length]} ${idx}`
      const movie = mockMovieTitles[idx % mockMovieTitles.length]
      
      // Years from 1970 to 2029 (covers 6 decades!)
      const year = 1970 + (idx % 60)
      const decade = `${Math.floor(year / 10) * 10}s`

      const numSingers = 1 + (idx % 2)
      const singers = []
      for (let s = 0; s < numSingers; s++) {
        singers.push(mockSingers[(idx + s) % mockSingers.length])
      }

      const numComposers = 1 + (idx % 2)
      const composers = []
      for (let c = 0; c < numComposers; c++) {
        composers.push(mockComposers[(idx + c) % mockComposers.length])
      }

      const lyricist = mockLyricists[idx % mockLyricists.length]
      const genre = mockGenres[idx % mockGenres.length]
      
      const numMoods = 1 + (idx % 2)
      const moods = []
      for (let m = 0; m < numMoods; m++) {
        moods.push(mockMoods[(idx + m) % mockMoods.length])
      }

      const popularity = 30 + (idx % 70)
      const songId = `perf-song-${idx}`

      batch.push({
        id: songId,
        title,
        artist: singers[0],
        album: movie,
        genre,
        year,
        composer: composers[0],
        lyrics: '',
        duration: 200 + (idx % 200),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Catalog Fields
        movie,
        decade,
        artistsJson: JSON.stringify(singers),
        composersJson: JSON.stringify(composers),
        lyricistsJson: JSON.stringify([lyricist]),
        genresJson: JSON.stringify([genre]),
        moodsJson: JSON.stringify(moods),
        popularity,
        tagsJson: JSON.stringify([genre, ...moods]),
        searchKeywordsJson: JSON.stringify([title, movie, ...singers, ...composers]),
        youtubeQuery: `${title} ${movie}`,
        downloaded: 0,
        favorite: 0,
        playCount: 0
      })
    }

    const transaction = db.transaction((items) => {
      for (const item of items) {
        db.insert(songs).values(item).onConflictDoNothing().run()
      }
    })
    transaction(batch)

    inserted += limit
    console.log(`Inserted ${inserted}/${count} performance test records...`)
  }

  console.log(`Successfully generated ${count} stress-testing records across 6 decades!`)
}
