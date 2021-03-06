const {Rental, validate} = require('../models/rental'); 
const {Movie} = require('../models/movie'); 
const {Customer} = require('../models/customer'); 
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Fawn = require('fawn');

Fawn.init(mongoose);

router.get('/', async (req, res) => {
  const rentals = await Rental.find().sort('-dateOut');
  res.send(rentals);
});

router.post('/', async (req, res) => {
  const { error } = validate(req.body); 
  if (error) return res.status(400).send(error.details[0].message);

  const customer = await Customer.findById(req.body.customerId);
  if (!customer) return res.status(400).send('Invalid customer.');

  var movies = [];

  for(i in req.body.movieId){
    const movie = await Movie.findById(req.body.movieId[i]);
    if (!movie) return res.status(400).send(`Movie not found for id g ${req.body.movieId[i]}`);
    if (movie.numberInStock[i] === 0) return res.status(400).send('Movie not in stock.');
    movies.push( { _id: movie._id, title: movie.title, dailyRentalRate: movie.dailyRentalRate } );

    try{
      new Fawn.Task()
      .update('movies', { _id: movie._id }, {
        $inc: { numberInStock: -1 }        
      })
      .run();
    }catch(ex){
      res.send(500, "An error occured!");
      return;
    }
  }

  let rental = new Rental({ 
    customer: {
      _id: customer._id,
      name: customer.name, 
      phone: customer.phone
    },
    movie: movies
  });

  try{
    new Fawn.Task()
    .save('rentals', rental)
    .run();
    res.send(rental);
  } catch(ex){
    res.send(500, "An error occured!");
    return;
  }
});

router.get('/:id', async (req, res) => {
  const rental = await Rental.findById(req.params.id);

  if (!rental) return res.status(404).send('The rental with the given ID was not found.');

  res.send(rental);
});

module.exports = router; 