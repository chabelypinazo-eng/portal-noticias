document.addEventListener('DOMContentLoaded', () => {
    let editingPostId = null;
    const form = document.getElementById('post-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const formTitle = document.querySelector('.admin-container h2');

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editingPostId = null;
            form.reset();
            formTitle.textContent = 'Crear Nueva Noticia';
            submitBtn.textContent = 'Publicar Noticia Principal';
            cancelEditBtn.style.display = 'none';
            statusMessage.textContent = '';
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const postDate = document.getElementById('post-date').value;
        const content = document.getElementById('content').value;
        const newsLink = document.getElementById('news_link').value;
        const newsSource = document.getElementById('news_source').value;
        const mediaFile = document.getElementById('media').files[0];

        if (!title || !content) {
            showMessage("El título y el contenido son obligatorios.", "error");
            return;
        }

        // Prepare FormData for multipart/form-data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        
        if (postDate) {
            // Convert local datetime to UTC for consistency in SQLite
            const dateObj = new Date(postDate);
            formData.append('created_at', dateObj.toISOString().replace('T', ' ').substring(0, 19));
        }
        
        if (newsLink && newsLink.trim() !== '') {
            formData.append('news_link', newsLink.trim());
        }

        if (newsSource && newsSource.trim() !== '') {
            formData.append('news_source', newsSource.trim());
        }

        if (mediaFile) {
            formData.append('media', mediaFile);
        }

        let url = '/api/posts';
        let method = 'POST';
        
        if (editingPostId) {
            url = `/api/posts/${editingPostId}`;
            method = 'PUT';
        }

        submitBtn.disabled = true;
        submitBtn.textContent = editingPostId ? 'Guardando...' : 'Publicando...';
        statusMessage.textContent = '';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData // No Content-Type header needed, browser sets it with boundary
            });
            
            const result = await response.json();
            
            if (response.ok && result.message === 'success') {
                showMessage(editingPostId ? "¡Noticia actualizada con éxito!" : "¡Noticia publicada con éxito!", "success");
                if (editingPostId) {
                    cancelEditBtn.click(); // resets form and state
                } else {
                    form.reset();
                }
                loadAdminPosts(); // Refresh list
            } else {
                showMessage(`Error: ${result.error || 'Desconocido'}`, "error");
            }
        } catch (error) {
            showMessage("Error de conexión al intentar publicar/guardar.", "error");
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = editingPostId ? 'Guardar Cambios' : 'Publicar Noticia Principal';
        }
    });

    function showMessage(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.style.color = type === 'error' ? 'var(--error)' : 'var(--success)';
    }

    // --- Gallery Management & Upload ---
    let editingGalleryId = null;
    const galleryForm = document.getElementById('gallery-form');
    const gallerySubmitBtn = document.getElementById('gallery-submit-btn');
    const galleryStatusMessage = document.getElementById('gallery-status-message');
    const cancelGalleryEditBtn = document.getElementById('cancel-gallery-edit-btn');
    const galleryFormTitle = document.querySelector('#gallery-form').parentElement.querySelector('h2');

    if (cancelGalleryEditBtn) {
        cancelGalleryEditBtn.addEventListener('click', () => {
            editingGalleryId = null;
            galleryForm.reset();
            galleryFormTitle.textContent = 'Subir Foto a la Galería';
            gallerySubmitBtn.textContent = 'Subir a Galería';
            cancelGalleryEditBtn.style.display = 'none';
            galleryStatusMessage.textContent = '';
            // Make image required again
            document.getElementById('gallery-image').required = true;
        });
    }

    galleryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const galleryFile = document.getElementById('gallery-image').files[0];
        const galleryDesc = document.getElementById('gallery-description').value;

        if (!editingGalleryId && !galleryFile) {
            showGalleryMessage("Debes seleccionar una imagen.", "error");
            return;
        }

        const formData = new FormData();
        if (galleryFile) {
            formData.append('image', galleryFile);
        }
        
        if (galleryDesc && galleryDesc.trim() !== '') {
            formData.append('description', galleryDesc.trim());
        }

        let url = '/api/gallery';
        let method = 'POST';
        
        if (editingGalleryId) {
            url = `/api/gallery/${editingGalleryId}`;
            method = 'PUT';
        }

        gallerySubmitBtn.disabled = true;
        gallerySubmitBtn.textContent = editingGalleryId ? 'Guardando...' : 'Subiendo...';
        galleryStatusMessage.textContent = '';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.message === 'success') {
                showGalleryMessage(editingGalleryId ? "¡Foto actualizada con éxito!" : "¡Foto subida a la galería con éxito!", "success");
                if (editingGalleryId) {
                    cancelGalleryEditBtn.click();
                } else {
                    galleryForm.reset();
                }
                loadAdminGallery();
            } else {
                showGalleryMessage(`Error al subir: ${result.error || 'Desconocido'}`, "error");
            }
        } catch (error) {
            showGalleryMessage("Error de conexión al intentar publicar/guardar la foto.", "error");
            console.error(error);
        } finally {
            gallerySubmitBtn.disabled = false;
            gallerySubmitBtn.textContent = editingGalleryId ? 'Guardar Cambios' : 'Subir a Galería';
        }
    });

    function showGalleryMessage(msg, type) {
        galleryStatusMessage.textContent = msg;
        galleryStatusMessage.style.color = type === 'error' ? 'var(--error)' : 'var(--success)';
    }

    async function loadAdminGallery() {
        const listContainer = document.getElementById('gallery-list-admin');
        if (!listContainer) return;
        
        try {
            const response = await fetch('/api/gallery');
            const data = await response.json();
            const images = data.data;

            listContainer.innerHTML = '';
            if (images.length === 0) {
                listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary)">No hay fotos en la galería.</p>';
                return;
            }

            images.forEach(img => {
                const dateStr = new Date(img.created_at).toLocaleString('es-ES');
                const div = document.createElement('div');
                div.className = 'admin-post-item';
                div.innerHTML = `
                    <div class="admin-post-info" style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${escapeHTML(img.image_url)}" alt="Foto" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <strong>${escapeHTML(img.description || 'Sin descripción')}</strong>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">${dateStr}</div>
                        </div>
                    </div>
                    <div class="admin-post-actions">
                        <button type="button" class="btn-edit-gallery">Editar</button>
                        <button type="button" class="btn-delete-gallery">Eliminar</button>
                    </div>
                `;
                div.dataset.gallery = JSON.stringify(img);
                listContainer.appendChild(div);
            });
        } catch (error) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--error)">Error al cargar galería.</p>';
        }
    }

    const galleryListAdmin = document.getElementById('gallery-list-admin');
    if (galleryListAdmin) {
        galleryListAdmin.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-edit-gallery')) {
                const item = e.target.closest('.admin-post-item');
                const galleryObj = JSON.parse(item.dataset.gallery);
                
                editingGalleryId = galleryObj.id;
                document.getElementById('gallery-description').value = galleryObj.description || '';
                
                // Make image upload optional when editing
                document.getElementById('gallery-image').required = false;
                
                galleryFormTitle.textContent = 'Editar Foto de Galería';
                gallerySubmitBtn.textContent = 'Guardar Cambios';
                cancelGalleryEditBtn.style.display = 'block';
                
                // Scroll to form
                galleryFormTitle.scrollIntoView({ behavior: 'smooth' });
                
            } else if (e.target.classList.contains('btn-delete-gallery')) {
                const item = e.target.closest('.admin-post-item');
                const galleryObj = JSON.parse(item.dataset.gallery);
                
                if (confirm('¿Estás seguro de que deseas eliminar esta foto del carrusel?')) {
                    try {
                        const res = await fetch(`/api/gallery/${galleryObj.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            loadAdminGallery();
                            if (editingGalleryId === galleryObj.id) {
                                cancelGalleryEditBtn.click();
                            }
                        } else {
                            alert('Error al eliminar la foto.');
                        }
                    } catch (err) {
                        alert('Error de conexión.');
                    }
                }
            }
        });

        // Initial load
        loadAdminGallery();
    }

    // --- Posts Management (Edit/Delete) ---
    async function loadAdminPosts() {
        const listContainer = document.getElementById('posts-list-admin');
        if (!listContainer) return;
        
        try {
            const response = await fetch('/api/posts');
            const data = await response.json();
            const posts = data.data;

            listContainer.innerHTML = '';
            if (posts.length === 0) {
                listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary)">No hay noticias publicadas.</p>';
                return;
            }

            posts.forEach(post => {
                const dateStr = new Date(post.created_at).toLocaleString('es-ES');
                const div = document.createElement('div');
                div.className = 'admin-post-item';
                div.innerHTML = `
                    <div class="admin-post-info">
                        <strong>${escapeHTML(post.title)}</strong>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">${dateStr}</div>
                    </div>
                    <div class="admin-post-actions">
                        <button type="button" class="btn-edit">Editar</button>
                        <button type="button" class="btn-delete">Eliminar</button>
                    </div>
                `;
                div.dataset.post = JSON.stringify(post);
                listContainer.appendChild(div);
            });
        } catch (error) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--error)">Error al cargar noticias.</p>';
        }
    }

    const postsListAdmin = document.getElementById('posts-list-admin');
    if (postsListAdmin) {
        postsListAdmin.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-edit')) {
                const item = e.target.closest('.admin-post-item');
                const post = JSON.parse(item.dataset.post);
                
                editingPostId = post.id;
                document.getElementById('title').value = post.title;
                
                // Set datetime-local value format
                const dateObj = new Date(post.created_at);
                dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
                document.getElementById('post-date').value = dateObj.toISOString().slice(0, 16);
                
                document.getElementById('content').value = post.content;
                document.getElementById('news_link').value = post.news_link || '';
                document.getElementById('news_source').value = post.news_source || '';
                
                formTitle.textContent = 'Editar Noticia';
                submitBtn.textContent = 'Guardar Cambios';
                cancelEditBtn.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
            } else if (e.target.classList.contains('btn-delete')) {
                const item = e.target.closest('.admin-post-item');
                const post = JSON.parse(item.dataset.post);
                
                if (confirm('¿Estás seguro de que deseas eliminar esta noticia? Esta acción no se puede deshacer.')) {
                    try {
                        const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            loadAdminPosts();
                            if (editingPostId === post.id) {
                                cancelEditBtn.click();
                            }
                        } else {
                            alert('Error al eliminar la noticia.');
                        }
                    } catch (err) {
                        alert('Error de conexión.');
                    }
                }
            }
        });

        // Initial load
        loadAdminPosts();
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
