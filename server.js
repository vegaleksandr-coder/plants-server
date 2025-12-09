javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализируем Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Проверка подключения
async function checkConnection() {
    try {
        const { data, error } = await supabase
            .from('plants')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        console.log('✅ Подключено к Supabase');
        
        // Инициализируем демо данные если нужно
        await initializePlants();
        
    } catch (error) {
        console.error('❌ Ошибка подключения к Supabase:', error);
        process.exit(1);
    }
}

async function initializePlants() {
    try {
        const { count, error } = await supabase
            .from('plants')
            .select('*', { count: 'exact', head: true });
        
        if (count === 0) {
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
            
            const { error: insertError } = await supabase
                .from('plants')
                .insert(demoPlantsData);
            
            if (insertError) throw insertError;
            console.log('✅ Демо данные добавлены');
        } else {
            console.log('✅ Таблица plants уже заполнена');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации данных:', error);
    }
}

// API Routes

// GET все растения
app.get('/api/plants', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('plants')
            .select('*');
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Ошибка получения растений:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET данные пользователя (избранное и проекты)
app.get('/api/users/:userId', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.params.userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        res.json(data || { id: req.params.userId, favorites: [], projects: [] });
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST добавить/удалить избранное
app.post('/api/users/:userId/favorites', async (req, res) => {
    try {
        const { plantId, isFavorite } = req.body;
        const userId = req.params.userId;
        
        // Получаем текущие избранные
        let { data: userData, error: getError } = await supabase
            .from('users')
            .select('favorites')
            .eq('id', userId)
            .single();
        
        let favorites = userData?.favorites || [];
        
        if (isFavorite) {
            if (!favorites.includes(plantId)) {
                favorites.push(plantId);
            }
        } else {
            favorites = favorites.filter(id => id !== plantId);
        }
        
        // Обновляем или создаем запись
        const { error } = await supabase
            .from('users')
            .upsert({ id: userId, favorites }, { onConflict: 'id' });
        
        if (error) throw error;
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
        const userId = req.params.userId;
        
        const { error } = await supabase
            .from('users')
            .upsert({ id: userId, projects }, { onConflict: 'id' });
        
        if (error) throw error;
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
checkConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
        console.log(`📝 API доступен по адресу http://localhost:${PORT}/api`);
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⛔ Отключение сервера...');
    process.exit(0);
});