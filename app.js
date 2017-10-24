'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
const UserRegister = require('./handlers/userRegister');
const GenerateKey = require('./handlers/generateKey');
const Knex = require('knex')({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : 'postgres',
        database : 'postgres'
    }
});


server.connection({
    port: '8080'
});


server.route( {

    path: '/register',
    method: 'PUT',
    handler: ( request, reply ) => {

        UserRegister(Knex, request, (err, res) => {

            if (err) {
                reply(err);
                return;
            }

            reply(res).code(200);
        });
    }

} );

server.route( {

    path: '/generate',
    method: 'POST',
    handler: ( request, reply ) => {

        GenerateKey(Knex, request, (err, res) => {

            if (err) {
                reply(err);
                return;
            }

            reply(res).code(200);
        });

    }

} );


server.start((err) => {

    if (err) {
        throw err;
    }
});
