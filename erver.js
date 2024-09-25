const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const OPENROUTESERVICE_API_KEY = '5b3ce3597851110001cf6248461ce4f521b24420bbc67527fa68a8ab';  // Substitua pela sua chave da API
const OPENROUTESERVICE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

let coordenadasMotorista = null;  // Variável para armazenar a localização do motorista

// Configurar rotas para servir as páginas HTML
app.use(express.static(path.join(__dirname, 'public')));

// Quando um cliente se conectar via WebSocket
io.on('connection', (socket) => {
    console.log('Novo cliente conectado');

    // Receber a localização do motorista da página motorista.html
    socket.on('localizacaoMotorista', (dadosMotorista) => {
        console.log('Localização do motorista recebida:', dadosMotorista);
        coordenadasMotorista = dadosMotorista;

        // Enviar a localização do motorista para os clientes na página rastrearpedido.html
        socket.broadcast.emit('atualizarLocalizacaoMotorista', coordenadasMotorista);
    });

    // Enviar as coordenadas de destino (endereço do cliente) quando solicitado
    socket.on('obterCoordenadasDestino', () => {
        const coordenadasDestino = { lat: -23.474086, lon: -46.658063 };  // Exemplo de coordenadas (Camboatas, 420)
        socket.emit('coordenadasDestino', coordenadasDestino);
    });

    // Calcular a rota entre o motorista e o destino usando a API OpenRouteService
    socket.on('calcularRotaMotoristaDestino', async (coordenadasDestino) => {
        if (!coordenadasMotorista) {
            socket.emit('erro', 'Localização do motorista não disponível');
            return;
        }

        try {
            const response = await axios.post(OPENROUTESERVICE_URL, {
                coordinates: [
                    [coordenadasMotorista.lon, coordenadasMotorista.lat],
                    [coordenadasDestino.lon, coordenadasDestino.lat]
                ]
            }, {
                headers: {
                    'Authorization': OPENROUTESERVICE_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const rotaGeoJSON = response.data.features[0].geometry;

            // Enviar a rota calculada para o cliente
            socket.emit('rotaCalculada', rotaGeoJSON);
        } catch (error) {
            console.error('Erro ao calcular a rota:', error);
            socket.emit('erro', 'Erro ao calcular a rota');
        }
    });

    // Manter o cliente informado se houver erro de localização ou rota
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Inicializar o servidor na porta desejada
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

