document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    fetchGallery();
});

async function fetchGallery() {
    const container = document.getElementById('gallery-container');
    
    try {
        const response = await fetch('/api/gallery');
        const result = await response.json();
        
        if (result.message === 'success') {
            renderGallery(result.data, container);
        } else {
            container.innerHTML = `<p class="col-span-1 md:col-span-3 text-center text-red-500">Error al cargar galería.</p>`;
        }
    } catch (error) {
        console.error("Fetch gallery error:", error);
    }
}

function renderGallery(images, container) {
    if (images.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; width: 100%; padding: 2rem; grid-column: 1 / -1;">No hay fotos recientes.</p>`;
        return;
    }

    container.innerHTML = '';
    
    images.forEach(img => {
        const div = document.createElement('div');
        div.className = 'relative group overflow-hidden rounded-3xl shadow-2xl bg-zinc-900 border border-zinc-800 h-64 md:h-80';
        
        let slideHTML = `<img src="${img.image_url}" alt="Foto galería" loading="lazy" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500">`;
        
        if (img.description) {
            slideHTML += `
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 pt-16">
                <p class="text-white font-medium drop-shadow-lg">${escapeHTML(img.description)}</p>
            </div>`;
        }
        
        div.innerHTML = slideHTML;
        container.appendChild(div);
    });
}

// === Post Logic ===

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    
    try {
        const response = await fetch('/api/posts');
        const result = await response.json();
        
        if (result.message === 'success') {
            renderPosts(result.data, container);
        } else {
            container.innerHTML = `<p style="color: var(--error); text-align: center;">Error al cargar: ${result.error}</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p style="color: var(--error); text-align: center;">Error de conexión.</p>`;
        console.error("Fetch error:", error);
    }
}

function renderPosts(posts, container) {
    if (posts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #a1a1aa; padding: 3rem; grid-column: 1 / -1;">No hay noticias publicadas aún.</p>`;
        return;
    }

    container.innerHTML = ''; // Clear loader
    
    posts.forEach((post, index) => {
        const card = document.createElement('div');
        card.className = 'bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 hover:border-red-600 transition flex flex-col';

        // The date from PostgreSQL is already parsed into a valid ISO string by the driver
        const date = new Date(post.created_at); 
        const formattedDate = date.toLocaleDateString('es-ES', { 
            day: '2-digit', month: 'short', year: 'numeric'
        }).toUpperCase();

        // Media section
        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'image') {
                mediaHtml = `<div class="h-48 md:h-56 bg-zinc-800 w-full"><img src="${post.media_url}" alt="Adjunto" loading="lazy" class="w-full h-full object-cover"></div>`;
            } else if (post.media_type === 'video') {
                mediaHtml = `
                <div class="h-48 md:h-56 bg-zinc-800 w-full">
                    <video controls preload="metadata" class="w-full h-full object-cover">
                        <source src="${post.media_url}" type="video/mp4">
                    </video>
                </div>`;
            }
        }
        
        let linkHtml = '';
        if (post.news_link) {
            const sourceName = post.news_source ? escapeHTML(post.news_source) : 'el Medio Oficial';
            linkHtml = `<a href="${post.news_link}" target="_blank" rel="noopener noreferrer" class="inline-block mt-6 text-red-500 font-medium hover:text-red-400 transition">Leer Noticia en ${sourceName} &rarr;</a>`;
        }

        const title = escapeHTML(post.title);
        const content = escapeHTML(post.content);

        card.innerHTML = `
            ${mediaHtml}
            <div class="p-8 flex-1 flex flex-col">
                <span class="text-red-500 text-sm font-bold tracking-wider">${formattedDate}</span>
                <h3 class="text-2xl font-bold mt-3 leading-tight">${title}</h3>
                <p class="text-zinc-400 mt-4 flex-1 whitespace-pre-wrap">${content}</p>
                ${linkHtml}
            </div>
        `;
        
        container.appendChild(card);
    });
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
        }[tag])
    );
}
