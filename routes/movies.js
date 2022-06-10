const express = require("express");
const router = express.Router();
const MovieModel = require("../models/movies");
var ed = require('edit-distance');
const hm = new Map([
        [28, 0],
        [12, 1],
        [16, 2],
        [35, 3],
        [80, 4],
        [99, 5],
        [18, 6],
        [10751, 7],
        [14, 8],
        [36, 9],
        [27, 10],
        [10402, 11],
        [9648, 12],
        [10749, 13],
        [878, 14],
        [10770, 15],
        [53, 16],
        [10752, 17],
        [37, 18],
      ]);

module.exports = router;

router.get("/", async function (req, res) {
  const movies = await MovieModel.find({}).populate("viewers");
  res.json(movies);
});

router.get("/toprated", async function(req, res) {
	var movies = await MovieModel.find({});
	movies.sort(function(a,b) {
		if (a.vote_average >= b.vote_average)
			return -1;
		else return 1;
	});
	res.json(movies);
});

function lev_dis(a,b) {
	var insert, remove, update;
	insert = remove = function(node) { return 1; };
	update = function(stringA, stringB) { return stringA !== stringB ? 1 : 0; };

	var l = Math.max(a.length,b.length);
	return (l-ed.levenshtein(a, b, insert, remove, update).distance)/l;
}

function sim(a, b) {
	a = a.toLowerCase();
	b = b.toLowerCase();
	if (b.length > a.length)
		return lev_dis(a,b);
	[a,b] = [b,a];
	var mx = 0;
	for (var i = 0; i+a.length <= b.length; i++)
		mx = Math.max(mx, lev_dis(a, b.substr(i, a.length)));
	return mx;
}

router.get("/search/:s", async function(req, res) {
	const s = req.params.s;
	const movies = await MovieModel.find({});
	var ret = [];
	for (var i = 0; i < movies.length; i++)
		if (sim(movies[i].title, s) >= 0.90)
			ret.push(movies[i]);
	ret.sort(function(a,b) {
		if (sim(a.title,s) > sim(b.title,s))
			return -1;
		else if (sim(a.title, s) < sim(b.title, s)) return 1;
		else if (a.popularity >= b.popularity) return -1;
		else return 1;
	});
	res.json(ret);
});

router.get("/mylist", async function(req, res) {
	res.json(await MovieModel.find({picked:1}));
});

router.get("/rated", async function(req, res) {
	res.json(await MovieModel.find({score: {$gt: 0.5}}));
});

router.post("/new", function (req, res) {
  const newMovie = new MovieModel({
    title: req.body.title,
    poster_path: req.body.poster_path,
    backdrop_path: req.body.backdrop_path,
    adult: req.body.adult,
    genre_ids: req.body.genre_ids,
    vote_average: req.body.vote_average,
    date: req.body.release_date,
    overview: req.body.overview,
    popularity: req.body.popularity,
    viewers: [],
	  score: 0,
    picked:false,
  });

  newMovie
    .save()
    .then(function (createdMovie) {
      res.status(201).json(createdMovie);
    })
    .catch(function (error) {
      res.status(500).json({ message: "Error while creating the movie" });
    });
});

function coordinate_compression(a) {
	var ret = []
	for (var i = 0; i < 19; i++)
		ret.push(0);
	for (var i = 0; i < a.genre_ids.length; i++)
		ret[hm.get(a.genre_ids[i])] = 1;
	return ret;
}

function dot_product(a,b) {
	var ret = 0;
	for (var i = 0; i < 19; i++)
		ret += a[i]*b[i];
	return ret;
}


router.get("/recommended", async function(req, res) {
	var movies = await MovieModel.find({score: {$gt: 0.5}});
	var ret = await MovieModel.find({score: 0});
	var average_genre_score = [];
	var cnt_genre = []
	for (var i = 0; i < 19; i++) {
		average_genre_score.push(0);
		cnt_genre.push(0);
	}
	for (var i = 0; i < movies.length; i++) {
		for (var j = 0; j < movies[i].genre_ids.length; j++) {
			const genre = hm.get(movies[i].genre_ids[j]);
			cnt_genre[genre]++;
			average_genre_score[genre] += movies[i].score-3;
		}
	}
	for (var i = 0; i < 19; i++)
		if (cnt_genre[i] > 0)
			average_genre_score[i] /= cnt_genre[i];
	ret.sort(function(a,b) {
		var ca = coordinate_compression(a);
		var cb = coordinate_compression(b);
		var da = dot_product(ca,average_genre_score);
		var db = dot_product(cb,average_genre_score);
		if (da >= db) return -1;
		else return 1;
	});
	res.json(ret);
});

router.put("/:id", async function (req, res) {

  const filter = { _id: req.params.id };

  var def_viewers = [];
  if (req.body.hasOwnProperty('viewers'))
	  def_viewers = req.body.viewers;
  var def_score = 0;
  if (req.body.hasOwnProperty('score'))
	  def_score = req.body.score;
    var def_picked = false;
    if (req.body.hasOwnProperty('picked'))
  	  def_picked = req.body.picked;
  const update = {
    title: req.body.title,
    date: req.body.date,
    genre_ids: req.body.genre_ids,
    adult: req.body.adult,
    viewers: def_viewers,
	  score: def_score,
    picked:def_picked,
  };
  try {
    const newDoc = await MovieModel.findOneAndUpdate(filter, update, {
      new: true,
    });
    res.json(newDoc);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occured while updating the movie" });
  }
});
