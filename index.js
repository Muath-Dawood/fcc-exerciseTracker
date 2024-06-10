require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

// create app
const app = express()

// config middlewares
app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))

// connect to database
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// schemas and models
const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, required: true }
});

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [exerciseSchema]
});

const User = mongoose.model('User', userSchema);

// api route handlers
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add exercise to a user
app.post('/api/users/:id/exercises', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, duration, date } = req.body;
    const exerciseDate = date ? new Date(date).toDateString() : new Date().toDateString();
    const exercise = { description, duration, date: exerciseDate };

    const user = await User.findByIdAndUpdate(
      id,
      { $push: { log: exercise } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get exercise log of a user
app.get('/api/users/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let log = user.log;

    if (from) {
      const fromDate = new Date(from);
      log = log.filter(exercise => new Date(exercise.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      log = log.filter(exercise => new Date(exercise.date) <= toDate);
    }

    if (limit) {
      log = log.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log.map(({ description, duration, date }) => ({ description, duration, date }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
