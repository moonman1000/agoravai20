const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios'); // Para fazer requisições HTTP

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OPENROUTESERVICE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';
const OPENROUTESERVICE_API_KEY = '5b3ce3597851110001cf6248461ce4f521b24420bbc67527fa68a8ab';

// Rota para servir arquivos estáticos
app.use(express.static('public'));

// Conectar ao Socket.io
io.on('connection', (socket) => {
    console.log('Novo cliente conectado');

    // Ouvir o evento de obterCoordenadas
    socket.on('obterCoordenadas', async (endereco) => {
        try {
            // Passo 1: Obter as coordenadas do endereço usando Nominatim
            const response = await axios.get(NOMINATIM_URL, {
                params: {
                    q: endereco,
                    format: 'json',
                    limit: 1
                }
            });

            if (response.data.length === 0) {
                socket.emit('dadosEntrega', { erro: 'Endereço não encontrado' });
                return;
            }

            const coordenadasDestino = {
                lat: parseFloat(response.data[0].lat),
                lon: parseFloat(response.data[0].lon)
            };

            // Coordenadas do motorista (Exemplo: Coordenadas fixas, mas no seu caso seria obtido de algum outro serviço)
            const coordenadasMotorista = { lat: -23.5505, lon: -46.6333 }; // Exemplo: São Paulo

            // Passo 2: Calcular a rota entre o motorista e o destino usando OpenRouteService
            const rotaResponse = await axios.post(OPENROUTESERVICE_URL, {
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

            const duracaoMinutos = Math.ceil(rotaResponse.data.routes[0].summary.duration / 60);

            // Passo 3: Enviar as coordenadas e o tempo estimado para o cliente
            socket.emit('dadosEntrega', {
                tempoEstimado: duracaoMinutos,
                coordenadas: coordenadasDestino
            });
        } catch (error) {
            console.error('Erro ao calcular rota:', error);
            socket.emit('dadosEntrega', { erro: 'Erro ao calcular rota' });
        }
    });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});


