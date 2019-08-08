var express = require('express'),
ejs = require('ejs');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
//var flash = require('express-flash')
var cookieParser = require('cookie-parser');
var session = require('express-session');
app.set('view engine', 'ejs');
app.use(express.static('public'));
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
var methodOverride = require('method-override')

app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method
    delete req.body._method
    return method
  }
}))

app.use(cookieParser('keyboard cat'))
app.use(session({ 
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
    //cookie: { maxAge: 60000 }
    //naxAge: 99999999
}))
//app.use(flash())




var categorias = [];
var articulos = [];
var carrito = [];
var ordenes = [];
var detalles_usuario;
var pagina_agregado = false;
var pagina_comprando = false;
var pagina_carrito = false;
var pagina_checkout = false;
var pagina_cuenta = false;
var pagina_index = true;
var ordenes_maximas;
var agregando = false;
function setCategorias(req,res){
    MongoClient.connect(url, function(err, db) {
     if (err) throw err;
     var dbo = db.db("MercaDelivery");
     dbo.collection("categorias").find({}).toArray(function(err, result) {
        if (err) throw err;
        categorias = result;
    });
});

}

function setOrdenes(req,res){
    MongoClient.connect(url, function(err, db) {
     if (err) throw err;
     var dbo = db.db("MercaDelivery");
     var query = {Correo: req.session.Correo};
     dbo.collection("ordenes").find(query).toArray(function(err, result) {
        if (err) throw err;
        ordenes = result;
        ordenes_maximas = 0;
        for(var i=0;i<ordenes.length;i++){
            if (ordenes_maximas < ordenes[i].Numero){
                ordenes_maximas = ordenes[i].Numero;
            }
        }
        console.log(ordenes_maximas);
    });
});

}

function setArticulos(req,res){
    MongoClient.connect(url, function(err, db) {
     if (err) throw err;
     var dbo = db.db("MercaDelivery");
     dbo.collection("articulos").find({}).toArray(function(err, result) {
        if (err) throw err;
        articulos = result;
        db.close();
    });
     if(pagina_agregado){
        pagina_agregado = false;
        res.redirect('/Agregado');
     }
     else if(pagina_comprando){
        pagina_comprando = false;
        res.redirect('/Terminado');
     }
     else if (pagina_carrito){
        pagina_carrito = false;
        res.redirect('Cart');
     }
     else if (pagina_checkout){
        query = {Correo: req.session.Correo};
        dbo.collection("usuarios").find(query).toArray(function(err, result) {
            if (err) throw err;
            detalles_usuario = result;
            pagina_checkout = false;
            res.redirect('Checkout?direccion=true');
        });
     }
     else if (pagina_cuenta){
        query = {Correo: req.session.Correo};
        dbo.collection("usuarios").find(query).toArray(function(err, result) {
            if (err) throw err;
            detalles_usuario = result;
            pagina_cuenta = false;
            res.redirect('Cuenta?direccion=true');
        });
     }
     else if(pagina_index){
         pagina_index = true;
         res.redirect('/index');
     }
     
});
}

function setCarrito(req,res){
    if(req.session.loggedin){
        MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("MercaDelivery");
        query = {Correo: req.session.Correo};
        dbo.collection("carrito").find(query).toArray(function(err, result) {
            if (err) throw err;
            carrito = result;
        });
    });
    }
}

app.get('/', function(req, res){
    res.type('text/html');
    if (pagina_comprando || pagina_agregado || pagina_carrito || pagina_checkout || pagina_cuenta){
        pagina_index = false;
    }
    else{
        pagina_index = true;
    }
    console.log(pagina_index);
    console.log(pagina_comprando);
    console.log(pagina_agregado);
    setCarrito(req,res);
    setCategorias(req,res);
    setOrdenes(req,res);
    setArticulos(req,res);
});


app.get('/index',function(req,res){
    if(categorias.length == 0){
        res.redirect('/');
    }
    else{
        res.render('index', {
        pagina:1,
        logueado: req.session.loggedin,
        categoria: categorias,
        articulo: articulos,
        carrito: carrito,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
    }
    
});

app.get('/Contacto', function(req, res){
    if(categorias.length == 0){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:2,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

app.get('/Catalogo', function(req, res){
    if (req.query.categoria == null || categorias.length == 0){
        res.redirect('/');
    }
    categoria_actual = req.query.categoria;
    for(var i=0;i<categorias.length;i++){
        if (categoria_actual == categorias[i].Nombre){
            no_existe = false;
            break;
        }
        else{
            no_existe = true;
        }
    }
    if(no_existe){
        res.redirect('/404');
    }
    else{
    res.type('text/html');
    
    res.render('index', {
        pagina:3,
        logueado: req.session.loggedin,
        categoria: categorias,
        articulos: articulos,
        categoria_actual: categoria_actual,
        carrito: carrito,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
    }
});

app.get('/Producto', function(req, res){
    var producto;
    var no_existe;
    if (req.query.articulo){
        for (var i=0;i<articulos.length;i++){
            if (articulos[i].Nombre == req.query.articulo){
                producto = articulos[i];
                no_existe = false;
                break;
            }
            else{
                no_existe = true;
            }
        }
        if(no_existe){
            res.redirect('/404');
        }
    }
    else{
        res.redirect('/');
    }
    if(categorias.length == 0){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:4,
        logueado: req.session.loggedin,
        categoria: categorias,
        articulo: producto,
        carrito: carrito,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

app.get('/Ordenes',function(req,res){
    setOrdenes(req,res);
    if(categorias.length == 0 || !req.session.loggedin){
        res.redirect('/');
    }
    else{
        res.render('index', {
        pagina:11,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        ordenes: ordenes,
        ordenes_maximas: ordenes_maximas,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
    }
    
});

app.get('/Orden_Especifico', function(req, res){
    setOrdenes(req,res);
    if(categorias.length == 0 || !req.session.loggedin || !req.query.Numero){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:12,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        ordenes: ordenes,
        correo: req.session.Correo,
        numero: req.query.Numero
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

app.get('/Cart', function(req, res){
    if(categorias.length == 0 || !req.session.loggedin){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:5,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        articulos: articulos,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});


app.get('/Checkout', function(req, res){
    if(categorias.length == 0 || !req.session.loggedin){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:6,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        correo: req.session.Correo,
        usuario: detalles_usuario,
        direccion_agregada: req.query.direccion
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

app.get('/login', function(req, res){
    if(categorias.length == 0){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:7,
        error: req.query.error,
        logueado: req.session.loggedin,
        categoria: categorias,
        correo: req.session.Correo,
        registro: req.query.registro
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

app.get('/register', function(req, res){
    if(categorias.length == 0){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:8,
        error: req.query.error,
        logueado: req.session.loggedin,
        categoria: categorias,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

app.get('/Cuenta', function(req, res){
    if(categorias.length == 0 || !req.session.loggedin){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:13,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        correo: req.session.Correo,
        usuario: detalles_usuario,
        direccion_agregada: req.query.direccion
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

// -----------------Funciones-------------------------//


app.get('/LogOut', function(req, res){
    res.type('text/html');
    req.session.destroy();
    res.render('index', {
        pagina:1,
        logueado: false,
        categoria: categorias,
        correo: '',
        articulo: articulos
    }, function(err, html){
        if(err) throw err;
        
    });
    res.redirect("/");
});


app.get('/Agregado', function(req, res){
    if(!req.session.loggedin || !agregando){
        res.redirect('/');
    }
    else{
        agregando = false;
    res.type('text/html');
    res.render('index', {
        pagina:9,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        correo: req.session.Correo,
        articulo: articulos
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});

app.get('/Terminado', function(req, res){
    if(categorias.length == 0 || !req.session.loggedin){
        res.redirect('/');
    }
    else{
    res.type('text/html');
    res.render('index', {
        pagina:10,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        correo: req.session.Correo,
        articulo: articulos
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });
}
});


app.post('/proceso-login', function(request, response) {
    var email = request.body.email;
    var pass = request.body.pass;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("MercaDelivery");
        query = {Correo: email,Password: pass};
        dbo.collection("usuarios").find(query).toArray(function(err, result) {
            if (err) throw err;
            if (result.length == 0){
                response.redirect('/login?error=true')
            }
            else{
            request.session.loggedin = true;
            request.session.Correo = email;
            detalles_usuario = result;
            console.log(detalles_usuario);
            response.redirect('/');
            }
  });
});
});


app.post('/proceso-registro', function(request, response) {
    var email = request.body.email;
    var pass = request.body.pass;
    var tipo = request.body.tipo;
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("MercaDelivery");
        query = {Correo: email};
        dbo.collection("usuarios").find(query).toArray(function(err, result) {
            if(err) throw err;
            if (result.length == 0){
                var registro = { Correo: email,Nombre: '',Apellido: '', Password: pass,Tipo: tipo,Direccion: '',Barriada: '',Telefono: '' };
                dbo.collection("usuarios").insertOne(registro, function(err, res) {
                    if (err) throw err;
                    db.close();
                    response.redirect('/Login?registro=success');
                });
            }
            else{
                response.redirect('/register?error=true');
            }
  });
});
    
});


app.get('/AgregarAlCarrito', function(req, res){
    var articulo = req.query.articulo;
    var cantidad = parseInt(req.query.cantidad);
    var precio = parseFloat(req.query.precio);
    console.log(req.query.lol);
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("MercaDelivery");
        var query = {Correo: req.session.Correo,Nombre: articulo};
        dbo.collection("carrito").find(query).toArray(function(err, result) {
            if (err) throw err;
            if (result.length == 0){
                var agregar = {Correo: req.session.Correo,Nombre: articulo,Cantidad: cantidad,Precio: precio};
                dbo.collection("carrito").insertOne(agregar, function(err, res) {
                    if (err) throw err;
                    db.close();
                    
                });
                agregando = true;
                pagina_agregado = true;
                res.redirect('/');
            }
            else{
                var buscar = {Correo: req.session.Correo,Nombre: articulo};
                var actualizar = {$set: {Cantidad: cantidad} };
                dbo.collection("carrito").updateOne(buscar, actualizar, function(err, res) {
                    if (err) throw err;
                    db.close();
                });
                agregando = true;
                pagina_agregado = true;
                res.redirect('/');
            }
        });
    });

});

app.get('/EliminardelCarrito', function(req, res){
    var articulo = req.query.articulo;
    var eliminar = {Correo: req.session.Correo,Nombre: articulo};
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("MercaDelivery");
        dbo.collection("carrito").deleteOne(eliminar, function(err, obj) {
            if (err) throw err;
            db.close();
            pagina_carrito = true;
            res.redirect('/');
        });
    });
});


app.get('/ActualizarCarrito', function(req, res){
    var articulo = req.query.Nombre;
    var cantidad = req.query.Cantidad;
    console.log(articulo);
    console.log(cantidad);
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("MercaDelivery");
        var buscar = {Correo: req.session.Correo,Nombre: articulo};
        var actualizar = {$set: {Cantidad: cantidad} };
        dbo.collection("carrito").updateOne(buscar,actualizar, function(err, obj) {
            if (err) throw err;
            db.close();
            pagina_carrito = true;
            res.redirect('/');
        });
    });
});


app.get('/Comprando', function(req, res){
    console.log(req.session.loggedin);
    if(!req.session.loggedin){
        res.redirect('/');
    }
    else{
        MongoClient.connect(url, function(err, db) {
            var dbo = db.db("MercaDelivery");
            //var carrito_length = carrito.length;
            var registro;
            var actualizar;
            var cantidad_nueva;
            var eliminar;
            var fecha = new Date();
            var dia = String(fecha.getDate());
            var mes = String(fecha.getMonth()+1);
            var año = String(fecha.getFullYear());
            var numero_siguiente = ordenes_maximas + 1;
            for (var i=0;i<carrito.length;i++){
                registro = {Correo: req.session.Correo,Nombre: carrito[i].Nombre,Precio: carrito[i].Precio,Cantidad: carrito[i].Cantidad,Estado: 'En_camino',Numero: numero_siguiente,Fecha: dia+'-'+mes+'-'+año};
                dbo.collection("ordenes").insertOne(registro, function(err, res) {
                    if (err) throw err;
                });
                actualizar = {Nombre: carrito[i].Nombre};
                for(var j=0;j<articulos.length;j++){
                    if(articulos[j].Nombre == carrito[i].Nombre){
                        cantidad_nueva = {$set: {Cantidad: articulos[j].Cantidad - carrito[i].Cantidad} };
                        break;
                    }
                }
                dbo.collection("articulos").updateOne(actualizar,cantidad_nueva,function(err,obj){
                    if (err) throw err;
                });
            }


        eliminar = { Correo: req.session.Correo };
        dbo.collection("carrito").deleteMany(eliminar, function(err, obj) {
            if (err) throw err;
            db.close();
            pagina_comprando = true;
            res.redirect('/');
        });
    });
    }
});


app.post('/ActualizarDetallesUsuario', function(req, res){
    var nombre = req.body.Nombre;
    var apellido = req.body.Apellido;
    var direccion = req.body.Direccion;
    var telefono = req.body.Telefono;
    var barriada = req.body.Barriada;
    var pagina = req.body.Pagina;
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("MercaDelivery");
        var buscar = {Correo: req.session.Correo};
        var actualizar = {$set: {Nombre: nombre,Apellido: apellido,Direccion: direccion,Telefono: telefono,Barriada: barriada} };
        dbo.collection("usuarios").updateOne(buscar,actualizar, function(err, obj) {
            if (err) throw err;
            db.close();
            if (pagina == 'cuenta'){
                pagina_cuenta= true;
            }
            else{
               pagina_checkout = true; 
            }
            
            res.redirect('/');
        });
    });
});

// Error 404
app.use(function(req, res){
    if(categorias.length == 0){
        res.redirect('/');
    }
    res.type('text/html');
    res.status(404);
    res.render('index', {
        pagina:404,
        logueado: req.session.loggedin,
        categoria: categorias,
        carrito: carrito,
        correo: req.session.Correo
    }, function(err, html){
        if(err) throw err;
        res.send(html);
    });

});


// Pagina de error 500
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.type('text/plain');
    res.status(500);
    res.send('500 - Server Error');
});

app.set('port', process.env.PORT || 3000);

app.listen(app.get('port'), function(){
    console.log( 'Servidor iniciado en http://localhost:' +
    app.get('port') + '; presiona Ctrl-C para terminar.' );
});