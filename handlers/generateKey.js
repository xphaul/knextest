'use strict';

module.exports = function (Knex, options, next) {

    Knex('users').where({
        email:  options.payload.email
    }).select('role')
        .then((response) => {

            if (response[0].role === 'admin') {

                Knex.schema.hasTable('invite_keys')
                    .then((exists) => {

                        if (!exists) {
                            return Knex.schema.withSchema('public').createTable('invite_keys', (usersTable) => {

                                usersTable.increments();
                                usersTable.string('created_by').notNullable();
                                usersTable.string('invitation_key').notNullable().unique();
                                usersTable.string('status').notNullable();
                                usersTable.string('used_by').unique();
                            }).then();
                        }
                    })
                    .then(() => {

                        let text = '';
                        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

                        for (let i = 0; i < 6; ++i) {
                            text += possible.charAt(Math.floor(Math.random() * possible.length));
                        }

                        const data = {
                            created_by: options.payload.email,
                            invitation_key: text,
                            status: 'unused',
                            used_by: null
                        };

                        Knex.insert( data ).into( 'invite_keys' )
                            .then(() => {

                                const responseData = {
                                    'created_by': options.payload.email,
                                    'invitation_key': text,
                                    'status': 'unused',
                                    'used_by': null
                                };

                                return next(null, responseData);
                            })
                            .catch((error) => {

                                return next(error, null);
                            });
                    });
            };
        });
};
