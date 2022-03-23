import { CustomModuleLoader } from './CustomModuleLoader';
let moduleLoader = new CustomModuleLoader('/dist/test-angular');
import * as express from 'express';
import * as swaggerUi from 'swagger-ui-express';
import * as cors from 'cors';
import * as Knex from 'knex';

import * as fs from 'fs';
//import '../app.module';
import { serverInit } from './server-init';
import { remultGraphql } from 'remult/graphql';


import { createPostgresConnection, preparePostgresQueueStorage } from 'remult/postgres';

import * as compression from 'compression';
import * as forceHttps from 'express-force-https';
import * as jwt from 'express-jwt';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import { remultExpress } from '../../../../core/server/expressBridge';
import * as knex from 'knex';

import { MongoClient } from 'mongodb';
import { stam } from '../products-test/products.component';
import { ClassType } from '../../../../core/classType';




const getDatabase = () => {
    if (1 + 1 == 3)
        return undefined;
    return createPostgresConnection({
        configuration: {
            user: "postgres",
            password: "MASTERKEY",
            host: "localhost",
            database: "postgres"
        }
    })
}


const d = new Date(2020, 1, 2, 3, 4, 5, 6);
serverInit().then(async (dataSource) => {

    let app = express();
    app.use(jwt({ secret: process.env.TOKEN_SIGN_KEY, credentialsRequired: false, algorithms: ['HS256'] }));
    app.use(cors());
    app.use(compression());
    if (process.env.DISABLE_HTTPS != "true")
        app.use(forceHttps);



    let remultApi = remultExpress({
        dataProvider: getDatabase(),
        queueStorage: await preparePostgresQueueStorage(dataSource),
        logApiEndPoints: true,
        initApi: async remult => {
        }
    });

    app.use(remultApi);
    app.use('/api/docs', swaggerUi.serve,
        swaggerUi.setup(remultApi.openApiDoc({ title: 'remult-angular-todo' })));

    app.use(express.static('dist/my-project'));
    app.get('/api/noam', async (req, res) => {
        let c = await remultApi.getRemult(req);
        res.send('hello ' + JSON.stringify(c.user));
    });

    let g = remultGraphql(remultApi);
    app.use('/api/graphql', graphqlHTTP({
        schema: buildSchema(g.schema),
        rootValue: g.rootValue,
        graphiql: true,
    }));


    app.use('/*', async (req, res) => {

        const index = 'dist/my-project/index.html';
        if (fs.existsSync(index)) {
            res.send(fs.readFileSync(index).toString());
        }
        else {
            res.send('No Result' + index);
        }
    });


    let port = process.env.PORT || 3001;
    app.listen(port);
});


const k = Knex.default({
    client: 'better-sqlite3', // or 'better-sqlite3'
    connection: {
        filename: ":memory:"
    },
});
k.schema.dropTableIfExists('test').then(async () => {
    await k.schema.createTable('test', async tb => {
        tb.integer('a');
        tb.date('d');
    })
    await k('test').insert({ a: 1, d: new Date() });
    const rows = await k('test').select();
    console.table(rows);
    console.log(typeof rows[0].d);

});


function what<a = any, b = any>(type: () => ClassType<b>, oneMore: b) {

}

class x {
    static a() {
        return (a) => { }
    }
}

@x.a()
class b {

}