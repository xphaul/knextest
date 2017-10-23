'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
const Boom = require('boom');
const Knex = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'postgres',
    database : 'postgres'
  },
  debug: true
});


server.connection({
    port: '8080'
});


server.route( {

    path: '/register',
    method: 'PUT',
    handler: ( request, reply ) => {

       Knex.schema.hasTable('users').then(function(exists) {
         if (!exists) {
           return Knex.schema.withSchema('public').createTable('users', function (usersTable) {
               usersTable.increments();
               usersTable.string('name').notNullable();
               usersTable.string('email', 128).notNullable().unique();
               usersTable.string('password').notNullable();
               usersTable.string('repassword').notNullable();
               usersTable.string('role').notNullable();
               usersTable.string('inviteKey').notNullable();
           }).then()
         }
       })
       .then(function() {
         if(request.payload.password === request.payload.repassword) {
           Knex.insert( request.payload ).into( 'users' )
           .then(function(response) {
             reply('Successfully Registered');
           })
           .catch(function(error) {
             reply(Boom.notFound('Please check all fields'));
           });
         } else {
           reply(Boom.notFound('Passwords does not match'));
         }
       });
    }

} );

server.route( {

    path: '/generate',
    method: 'POST',
    handler: ( request, reply ) => {
      Knex('users').where({
        email:  request.payload.email
      }).select('role')
      .then(function(response) {
        if(response[0].role === 'admin') {
          Knex.schema.hasTable('users').then(function(exists) {
            if (!exists) {
              return Knex.schema.withSchema('public').createTable('invite_keys', function (usersTable) {
                  // generate keys
              }).then()
            }
          })
          reply('this user is admin')
        };
      })

    }

} );


server.start((err) => {

    if (err) {
        throw err;
    }
});
