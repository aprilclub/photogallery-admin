// Глобальные переменные
let isAdmin = false;
let photos = [];
let currentPhotoId = null;

// DOM элементы
const authModal = document.getElementById('authModal');
const mainContent = document.getElementById('mainContent');
const adminBadge = document.getElementById('adminBadge');
const uploadBtn = document.getElementById('uploadBtn');
const logoutBtn = document.getElementById('logoutBtn');
const uploadModal = document.getElementById('uploadModal');
const viewModal = document.getElementById('viewModal');
const uploadForm = document.getElementById('uploadForm');
const loginForm = document.getElementById('loginForm');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const resetBtn = document.getElementById('resetBtn');
const statsEl = document.getElementById('stats');
const deleteBtn = document.getElementById('deleteBtn');
const loginError = document.getElementById('loginError');

// Проверка авторизации при загрузке
checkAuth();

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    
    if (token) {
        // Проверяем токен на сервере
        fetch('http://localhost:3000/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                isAdmin = true;
                showMainContent();
                loadPhotos();
            } else {
                localStorage.removeItem('adminToken');
                showAuthModal();
            }
        })
        .catch(() => {
            localStorage.removeItem('adminToken');
            showAuthModal();
        });
    } else {
        showAuthModal();
    }
}

// Показать модальное окно авторизации
function showAuthModal() {
    authModal.style.display = 'flex';
    mainContent.style.display = 'none';
}

// Показать основной контент
function showMainContent() {
    authModal.style.display = 'none';
    mainContent.style.display = 'block';
    
    if (isAdmin) {
        adminBadge.style.display = 'block';
    } else {
        adminBadge.style.display = 'none';
    }
}

// Вход как гость
function loginAsGuest() {
    isAdmin = false;
    showMainContent();
    loadPhotos();
}

// Обработчик формы входа
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    loginError.textContent = '';
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            isAdmin = true;
            showMainContent();
            loadPhotos();
        } else {
            loginError.textContent = data.message || 'Неверный логин или пароль';
        }
    } catch (error) {
        loginError.textContent = 'Ошибка подключения к серверу';
        console.error('Ошибка входа:', error);
    }
});

// Выход
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    isAdmin = false;
    showAuthModal();
});

// Загрузка фото
async function loadPhotos() {
    try {
        const response = await fetch('http://localhost:3000/api/photos');
        const result = await response.json();
        
        if (result.success) {
            photos = result.photos;
            generateFilters();
            applyFilters();
            updateStats();
        }
    } catch (error) {
        console.error('Ошибка загрузки фото:', error);
        alert('❌ Ошибка загрузки фото');
    }
}

// Генерация фильтров
function generateFilters() {
    const filtersContainer = document.getElementById('filters');
    filtersContainer.innerHTML = '';
    
    // Считаем количество фото в каждой категории
    const categoryCounts = {};
    photos.forEach(photo => {
        categoryCounts[photo.category] = (categoryCounts[photo.category] || 0) + 1;
    });
    
    // Категории
    const categories = {
        nature: 'Природа',
        city: 'Город',
        portrait: 'Портреты',
        night: 'Ночь',
        architecture: 'Архитектура',
        other: 'Другое'
    };
    
    // Создаём чекбокс для каждой категории
    Object.entries(categories).forEach(([key, name]) => {
        const count = categoryCounts[key] || 0;
        if (count === 0) return;
        
        const filterItem = document.createElement('div');
        filterItem.className = 'filter-item';
        filterItem.innerHTML = `
            <input type="checkbox" id="filter-${key}" class="filter-checkbox" 
                   data-category="${key}" checked>
            <label for="filter-${key}" class="filter-label">
                ${name}
                <span class="filter-count">${count}</span>
            </label>
        `;
        filtersContainer.appendChild(filterItem);
    });
    
    // Добавляем обработчики событий
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}

// Применение фильтров
function applyFilters() {
    const selectedCategories = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
        .map(cb => cb.dataset.category);
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    let visibleCount = 0;
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';
    
    photos.forEach(photo => {
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(photo.category);
        const searchMatch = searchTerm === '' || photo.caption.toLowerCase().includes(searchTerm);
        
        if (categoryMatch && searchMatch) {
            const item = createGalleryItem(photo);
            gallery.appendChild(item);
            visibleCount++;
        }
    });
    
    updateStats(visibleCount);
    updateResetButton();
}

// Создание элемента галереи
function createGalleryItem(photo) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.category = photo.category;
    item.dataset.caption = photo.caption.toLowerCase();
    
    // Категории для отображения
    const categories = {
        nature: 'Природа',
        city: 'Город',
        portrait: 'Портреты',
        night: 'Ночь',
        architecture: 'Архитектура',
        other: 'Другое'
    };
    
    item.innerHTML = `
        <img src="${photo.src}" alt="${photo.caption}">
        <div class="caption">${photo.caption}</div>
        <div class="category-badge ${photo.category}">${categories[photo.category]}</div>
    `;
    
    item.onclick = () => openViewModal(photo);
    return item;
}

// Открыть модальное окно просмотра
function openViewModal(photo) {
    const modalContent = document.getElementById('modalContent');
    const modalCaption = document.getElementById('modalCaption');
    
    modalContent.innerHTML = `<img src="${photo.src}" alt="${photo.caption}">`;
    modalCaption.textContent = photo.caption;
    currentPhotoId = photo.id;
    
    // Показать кнопку удаления только для администраторов
    if (isAdmin) {
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => deletePhoto(photo.id);
    } else {
        deleteBtn.style.display = 'none';
    }
    
    viewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрыть модальное окно просмотра
function closeViewModal() {
    viewModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPhotoId = null;
}

// Удалить фото
async function deletePhoto(id) {
    if (!confirm('Вы уверены, что хотите удалить это фото?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`http://localhost:3000/api/photos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Фото удалено');
            loadPhotos();
            closeViewModal();
        } else {
            alert('❌ Ошибка: ' + result.message);
        }
    } catch (error) {
        alert('❌ Ошибка удаления: ' + error.message);
    }
}

// Открыть модальное окно загрузки
function openUploadModal() {
    if (!isAdmin) {
        alert('⚠️ Только администраторы могут загружать фото');
        return;
    }
    
    uploadModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрыть модальное окно загрузки
function closeUploadModal() {
    uploadModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    uploadForm.reset();
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('progressBar').style.width = '0%';
}

// Обработчик формы загрузки
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const captionInput = document.getElementById('captionInput');
    const categoryInput = document.getElementById('categoryInput');
    
    const file = fileInput.files[0];
    const caption = captionInput.value;
    const category = categoryInput.value;
    
    if (!file) {
        alert('⚠️ Выберите файл');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('⚠️ Файл слишком большой (максимум 5 МБ)');
        return;
    }
    
    // Показываем прогресс
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    uploadProgress.style.display = 'block';
    
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('caption', caption);
    formData.append('category', category);
    
    try {
        const token = localStorage.getItem('adminToken');
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressBar.style.width = percent + '%';
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText);
                alert('✅ Фото загружено!');
                closeUploadModal();
                loadPhotos();
            } else {
                const result = JSON.parse(xhr.responseText);
                alert('❌ Ошибка: ' + result.message);
            }
        });
        
        xhr.addEventListener('error', () => {
            alert('❌ Ошибка загрузки');
        });
        
        xhr.open('POST', 'http://localhost:3000/api/photos');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
        
    } catch (error) {
        alert('❌ Ошибка загрузки: ' + error.message);
    }
});

// Обновление статистики
function updateStats(visibleCount = null) {
    if (visibleCount === null) {
        visibleCount = document.querySelectorAll('.gallery-item').length;
    }
    
    const total = photos.length;
    
    if (visibleCount === total) {
        statsEl.textContent = `Показаны все ${total} фотографий`;
    } else {
        statsEl.textContent = `Показано ${visibleCount} из ${total} фотографий`;
    }
}

// Обновление кнопки сброса
function updateResetButton() {
    const anyUnchecked = Array.from(document.querySelectorAll('.filter-checkbox')).some(cb => !cb.checked);
    const hasSearch = searchInput.value.trim() !== '';
    resetBtn.disabled = !anyUnchecked && !hasSearch;
}

// Сброс фильтров
function resetFilters() {
    document.querySelectorAll('.filter-checkbox').forEach(cb => {
        cb.checked = true;
    });
    
    searchInput.value = '';
    searchClear.classList.remove('visible');
    
    applyFilters();
}

// Инициализация поиска
searchInput.addEventListener('input', function() {
    searchClear.classList.toggle('visible', this.value.trim() !== '');
    applyFilters();
});

searchClear.addEventListener('click', function() {
    searchInput.value = '';
    this.classList.remove('visible');
    applyFilters();
});

resetBtn.addEventListener('click', resetFilters);

// Кнопка загрузки
uploadBtn.addEventListener('click', openUploadModal);

// Закрытие модальных окон по клику вне
uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) closeUploadModal();
});

viewModal.addEventListener('click', (e) => {
    if (e.target === viewModal) closeViewModal();
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (uploadModal.classList.contains('active')) closeUploadModal();
        if (viewModal.classList.contains('active')) closeViewModal();
    }
});