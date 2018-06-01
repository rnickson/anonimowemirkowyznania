module.exports = {
    //http://www.wykop.pl/dla-programistow/twoje-aplikacje/
    wykop: {
      key: 'wykop_app_apikey', //apiKey
      secret: 'wykop_app_secret', //app secret
      connection: 'connection_key', //connection key (https://www.wykop.pl/dla-programistow/twoje-aplikacje/)
      username: 'sokytsinolop', //username
      password: 'password', //password and username are required to handle surverys
    },
    siteURL: 'https://localhost:1337', //site url
    mongoURL: 'mongodb://username:password@host/database',
    secret: 'secret_for_signing_jwt', //website's secret key,
    websocketPort: 8090 //port on which a websockets server will work 
  }
  