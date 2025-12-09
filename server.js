const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'plants_db';

// Middleware
app.use(cors());
app.use(express.json());

let db;
let mongoClient;

// Подключение к MongoDB
async function connectToMongo() {
    try {
        mongoClient = new MongoClient(MONGO_URL, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        
        await mongoClient.connect();
        db = mongoClient.db(DB_NAME);
        
        console.log('✅ Подключено к MongoDB Atlas');
        
        // Инициализируем коллекции и демо данные
        await initializeCollections();
        
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
}

async function initializeCollections() {
    try {
        // Создаем коллекции если их нет
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (!collectionNames.includes('plants')) {
            await db.createCollection('plants');
            console.log('✅ Коллекция plants создана');
            
            // Добавляем демо данные
            const demoPlantsData = [
                {
                    id: 1,
                    nameRU: "Яблоня домашняя",
                    nameLAT: "Malus domestica",
                    type: "Дерево",
                    foliage: "Лиственное",
                    height: "высокие (более 2,5 м)",
                    zone: "kolesniv_3",
                    soil: ["суглинок", "супесчаная"],
                    light: "полное_солнце",
                    purpose: ["съедобный_сад"],
                    relevance: 95,
                    description: "Классовая плодовая культура для средней полосы.",
                    images: ["🍎", "🌸", "🍃", "❄️"]
                },
                {
                    id: 2,
                    nameRU: "Лаванда узколистная",
                    nameLAT: "Lavandula angustifolia",
                    type: "Многолетник",
                    foliage: "Вечнозеленое",
                    height: "низкие (до 1 м)",
                    zone: "kolesniv_3",
                    soil: ["супесчаная", "песчаная"],
                    light: "полное_солнце",
                    purpose: ["декоративная_клумба"],
                    relevance: 90,
                    description: "Ароматный кустарничек с фиолетовыми соцветиями.",
                    images: ["💜", "🌼", "🍃", "❄️"]
                },
                {
                    id: 3,
                    nameRU: "Ель обыкновенная",
                    nameLAT: "Picea abies",
                    type: "Дерево",
                    foliage: "Хвойное",
                    height: "высокие (более 2,5 м)",
                    zone: "kolesniv_3",
                    soil: ["суглинок"],
                    light: "полное_солнце",
                    purpose: ["декоративная_клумба"],
                    relevance: 85,
                    description: "Вечнозеленая хвойная культура.",
                    images: ["🌲", "🌲", "⛄", "🌲"]
                },
                {
                    id: 4,
                    nameRU: "Помидор обыкновенный",
                    nameLAT: "Solanum lycopersicum",
                    type: "Однолетник",
                    foliage: "Лиственное",
                    height: "средние (1-2,5 м)",
                    zone: "kolesniv_3",
                    soil: ["суглинок"],
                    light: "полное_солнце",
                    purpose: ["съедобный_сад"],
                    relevance: 92,
                    description: "Универсальная овощная культура.",
                    images: ["🍅", "🌸", "🌿", "🍅"]
                },
                {
                    id: 5,
                    nameRU: "Роза парковая",
                    nameLAT: "Rosa rugosa",
                    type: "Кустарник",
                    foliage: "Лиственное",
                    height: "средние (1-2,5 м)",
                    zone: "kolesniv_3",
                    soil: ["суглинок"],
                    light: "полное_солнце",
                    purpose: ["декоративная_клумба"],
                    relevance: 89,
                    description: "Морозостойкая роза с крупными ароматными цветками.",
                    images: ["🌹", "🌺", "🍂", "🌹"]
                }
            ];
            
            await db.collection('plants').insertMany(demoPlantsData);
            console.log('✅ Демо данные добавлены');
        } else {
            console.log('✅ Коллекция plants уже существует');
        }
        
        if (!collectionNames.includes('users')) {
            await db.createCollection('users');
            console.log('✅ Коллекция users создана');
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации коллекций:', error);
    }
}

// API Routes

// GET все растения
app.get('/api/plants', async (req, res) => {
    try {
        const plants = await db.collection('plants').find({}).toArray();
        res.json(plants);
    } catch (error) {
        console.error('Ошибка получения растений:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET данные пользователя (избранное и проекты)
app.get('/api/users/:userId', async (req, res) => {
    try {
        const user = await db.collection('users').findOne({ _id: req.params.userId });
        if (user) {
            res.json(user);
        } else {
            res.json({ favorites: [], projects: [] });
        }
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST добавить/удалить избранное
app.post('/api/users/:userId/favorites', async (req, res) => {
    try {
        const { plantId, isFavorite } = req.body;
        const update = isFavorite 
            ? { $addToSet: { favorites: plantId } }
            : { $pull: { favorites: plantId } };
        
        await db.collection('users').updateOne(
            { _id: req.params.userId },
            update,
            { upsert: true }
        );
        res.json({ ok: true });
    } catch (error) {
        console.error('Ошибка сохранения избранного:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT сохранить проекты
app.put('/api/users/:userId/projects', async (req, res) => {
    try {
        const { projects } = req.body;
        await db.collection('users').updateOne(
            { _id: req.params.userId },
            { $set: { projects } },
            { upsert: true }
        );
        res.json({ ok: true });
    } catch (error) {
        console.error('Ошибка сохранения проектов:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 для неизвестных маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Запуск сервера
connectToMongo().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
        console.log(`📝 API доступен по адресу http://localhost:${PORT}/api`);
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⛔ Отключение сервера...');
    if (mongoClient) {
        await mongoClient.close();
        console.log('✅ Соединение с MongoDB закрыто');
    }
    process.exit(0);
});