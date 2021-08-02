const express = require('express');
const router = express.Router();
const logger = require('../logger');
const isLoggedIn = require('../middleware/login');

const BigliettiService = require('../services/bigliettiService');
const EventoService = require('../services/EventoService');


const Sequelize = require("sequelize");
//const sequelize = new Sequelize('mysql://user:user@localhost:3306/cybersecurity');

const database = new Sequelize('cybersecurity', 'user', 'user', {
    dialect: 'mysql',
    host: "localhost",
    port: 3306,
})

// const ContractModel = require('../models/Contract')
// const EventModel = require('../models/Evento');
// const TicketModel = require('../models/Biglietto');
// const User = new Usermodel(database,Sequelize);

const Contract = require('web3-eth-contract');
const fs = require("fs");

Contract.setProvider('http://127.0.0.1:22000');


router.get('/', isLoggedIn, (req, res) => {

    logger.info('TEST EVENTO' + req.body)

    database.query('SELECT * FROM contract where lower(name) like \'evento%\'', {type: database.QueryTypes.SELECT}).then(async results => {


        if (results.length !== 0) {
            let list_out = []
            // for each found event
            for (const evento of results) {
                // get an instance of the event
                const eventoService = await EventoService.getInstance({
                    // user account address
                    account: req.session.user.account,
                    // host URL
                    host: 'http://localhost:22000',
                    // contract account address
                    address: evento.address
                });


                // TODO: solo per prova, togliere (l'inserimento dei dati dell'evento deve avvenire dopo il deploy del contratto)
               // const evento_info = await eventoService.storeItem(1, 'Concerto X', 'Macerata', '20/12/2022', '21:00', 'Artista Y', 1500);


                // get title of the event
                const titolo = await eventoService.getTitolo();
                // get place of the event
                const luogo = await eventoService.getLuogo();
                // get capacity of the event
                const capienza = await eventoService.getCapienza();
                // get state of the event
                const stato = await eventoService.getStato();
                // get date of the event
                const data = await eventoService.getData();
                // get time of the event
                const orario = await eventoService.getOrario();
                // get artist of the event
                const artista = await eventoService.getArtista();
                // get timestamp of the event
                const timestamp = await eventoService.getTimestamp();

                const evnt = {
                    id: evento.id,
                    titolo: titolo,
                    luogo: luogo,
                    capienza: capienza,
                    stato: stato,
                    data: data,
                    orario: orario,
                    artista: artista,
                    timestamp: timestamp
                }
                list_out.push(evnt)
            }

            return res.render('listaEventi', {title: 'Lista Eventi', results: list_out, user: req.session.user})
        } else {
            req.flash('error', 'ERRORE, nessun contratto evento trovato.');
            return res.redirect("/");
        }

    })
});

router.get("/id/:id", isLoggedIn, (req, res) => {

    const id = req.params.id

    logger.info('TEST EVENTO ID' + id)

    database.query('SELECT * FROM contract WHERE lower(name) like \'evento%\' AND id =' + id, {type: database.QueryTypes.SELECT}).then(async result => {

        if (result.length !== 0) {
            // get an instance of the event
            const eventoService = await EventoService.getInstance({
                // user account address
                account: req.session.user.account,
                // host URL
                host: 'http://localhost:22000',
                // contract account address
                address: result[0].address
            });

            // get title of the event
            const titolo = await eventoService.getTitolo();
            // get place of the event
            const luogo = await eventoService.getLuogo();
            // get capacity of the event
            const capienza = await eventoService.getCapienza();
            // get state of the event
            const stato = await eventoService.getStato();
            // get date of the event
            const data = await eventoService.getData();
            // get time of the event
            const orario = await eventoService.getOrario();
            // get artist of the event
            const artista = await eventoService.getArtista();

            const evnt = {
                id: result[0].id,
                titolo: titolo,
                luogo: luogo,
                capienza: capienza,
                stato: stato,
                data: data,
                orario: orario,
                artista: artista
            }
            return res.render('evento', {title: 'Dettagli Evento', result: evnt, user: req.session.user})
        } else {
            req.flash('error', 'ERRORE, il contratto dell\'evento selezionato non è stato trovato.');
            return res.redirect('/');
        }

    })
});

router.get("/id/:id/biglietti", isLoggedIn, async (req, res) => {

    const id = req.params.id

    logger.info('GET BIGLIETTI DATO ID EVENTO' + id)


    database.query('SELECT * FROM contract WHERE lower(name)=\'biglietti_evento_' + id + '\'', {type: database.QueryTypes.SELECT}).then(async result => {
        if (result.length !== 0) {
            // get an instance of the tickets
            const bigliettiSevice = await BigliettiService.getInstance({
                // user account address
                account: req.session.user.account,
                // host URL
                host: 'http://localhost:22000',
                // contract account address
                address: result[0].address
            });

            const biglietti = await bigliettiSevice.getBiglietti();

            return res.render('listaBiglietti', {
                title: 'Biglietti Venduti',
                results: biglietti,
                user: req.session.user
            })
        } else {
            req.flash('error', 'ERRORE, contratto biglietti non trovato.');
            return res.redirect('/');
        }
    });
});

router.get("/id/:id/acquistabiglietto", isLoggedIn, async (req, res) => {

    return res.render('acquistoBiglietto', {
        title: 'Acquista Biglietto',
        id_evento: req.params.id,
        user: req.session.user,
        errorMsg: req.flash("error"),
        csrfToken: req.csrfToken()
    })
});


router.post("/id/:id/acquistabiglietto", isLoggedIn, async (req, res) => {


    let ticketType = req.body.ticket_type;
    let ticketPrice;
    const id_evento = req.params.id;

    switch (ticketType) {
        case 'platinum':
            ticketType = 0;
            ticketPrice = '59.99';
            break;
        case 'gold':
            ticketType = 1;
            ticketPrice = '39.99';
            break;
        default:
            ticketType = 2;
            ticketPrice = '19.99';
    }

    database.query('SELECT * FROM contract WHERE lower(name)=\'biglietti_evento_' + id_evento + '\'', {type: database.QueryTypes.SELECT}).then(async result => {
        if (result.length !== 0) {
            // get an instance of the tickets
            const bigliettiSevice = await BigliettiService.getInstance({
                // user account address
                account: req.session.user.account,
                // host URL
                host: 'http://localhost:22000',
                // contract account address
                address: result[0].address
            });

            // store the sold ticket
            const ticket_info = await bigliettiSevice.storeItem(new Date().toISOString(), ticketPrice, ticketType);
            req.flash('success', 'Biglietto acquistato correttamente.');
        } else {
            req.flash('error', 'ERRORE, contratto biglietti non trovato.');
        }
        return res.redirect('/');
    });
});


router.get('/newevento', isLoggedIn, (req, res) => {
    logger.info('Form di creazione evento');
    res.render('evento_form', {
        title: "Crea Evento",
        user: req.session.user,
        csrfToken: req.csrfToken()
    });
});


router.post('/newevento', isLoggedIn, async (req, res) => {
    logger.info('Inizio Salvataggio Evento ...')
    const titolo = req.body.titolo;
    const luogo = req.body.luogo;
    const data = req.body.date;
    const orario = req.body.orario;
    const artista = req.body.artista;
    const capienza = req.body.capienza;

    logger.info(" Test Parametri:"+ titolo + ", " + luogo + ", " + data + ", ecc..." )

    //TODO: controlli sugli attributi dell'evento

    //Idea 1: usare la json interface
    var fs = require('fs');
    var obj = JSON.parse(fs.readFileSync('../build/contracts/Evento.json', 'utf8'));
    const eventoInterface = obj['abi'];
    var Contract = require('web3-eth-contract');
    Contract.setProvider('http://127.0.0.1:22000');

    let nuovoEvento = new Contract(eventoInterface);

    //Prende il bytecode del contratto "Evento"
    await nuovoEvento.deploy({
        data: obj['bytecode'],

        arguments: null
    }).send({
        from: req.session.user.account
    }).then((instance) => {
        global.savedAddress = instance.options.address;
        logger.info("Contract mined at " + savedAddress);
    });

    const timestamp = new Date().toISOString();

    const eventoService = await EventoService.getInstance({
        account: req.session.user.account,
        host: 'http://localhost:22000',
        address: savedAddress
    });

    const evento_info = await eventoService.storeItem(1000, titolo, luogo, data, orario, artista, capienza);

    //TODO: correggere createdAt, updated At
    await database.query({query:"INSERT INTO contract (name, address, createdAt, updatedAt) VALUES ('evento',?,'2021-07-30 10:56:10','2021-07-30 10:56:10')",values: [savedAddress]}, function (err, result) {
        if (err) throw err;
        logger.info("1 record inserted, ID:" + result.insertId);
    });


    return res.redirect("/evento");



});




module.exports = router;