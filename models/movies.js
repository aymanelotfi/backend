const mongoose = require("mongoose");
const { Schema } = mongoose;

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  poster_path: { type: String },
  backdrop_path: { type: String },
  adult: { type: Boolean },
  genre_ids: { type: Array, required: true },
  vote_average: { type: Number },
  date: { type: Date, required: true},
  overview: { type: String },
  popularity: { type: Number },
  viewers: [{ type: Schema.Types.ObjectId, ref: "UserModel" }],
  score: {type: Number},
  picked: {type: Boolean}
});

const MovieModel = mongoose.model("MovieModel", MovieSchema, "movies");

module.exports = MovieModel;
