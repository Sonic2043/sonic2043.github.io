// Configuración de tu tienda (Personalizá estos datos)
const TELEFONO_WHATSAPP = "5491112345678"; // Poné tu número con código de país (549...)
const LINK_MERCADOPAGO = "https://link.mercadopago.com.ar/tuusuario"; // Tu alias o link de pago

let productos = [];
let carrito = JSON.parse(localStorage.getItem('onix_carrito')) || [];

// Cargar productos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await cargarProductos();
    actualizarCarritoUI();
});

async function cargarProductos() {
    try {
        // Intenta cargar desde el archivo JSON
        const respuesta = await fetch('productos.json');
        const datos = await respuesta.json();
        // Ordenar por ventas (autoaprendizaje: los más vendidos aparecen primero)
        productos = datos.productos.sort((a, b) => b.ventas - a.ventas);
        renderizarProductos(productos);
    } catch (error) {
        console.error("Error cargando JSON:", error);
    }
}

function renderizarProductos(lista) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = '<p>No se encontraron productos en esta categoría.</p>';
        return;
    }

    lista.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="image-box">
                <img src="${prod.imagen}" alt="${prod.nombre}" loading="lazy">
            </div>
            <div class="product-info">
                <span class="product-category">${prod.categoria}</span>
                <div class="product-price">$${prod.precio.toLocaleString('es-AR')}</div>
                <h4 class="product-title">${prod.nombre}</h4>
                <p class="product-desc">${prod.descripcion}</p>
                <button class="buy-btn" onclick="agregarAlCarrito(${prod.id})">
                    Comprar
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Filtros por categoría y búsqueda
function filtrarCategoria(categoria) {
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const titulo = document.getElementById('titulo-categoria');
    if (categoria === 'todos') {
        titulo.textContent = 'Todos los Productos';
        renderizarProductos(productos);
    } else {
        titulo.textContent = `Categoría: ${categoria}`;
        const filtrados = productos.filter(p => p.categoria === categoria);
        renderizarProductos(filtrados);
    }
}

function filtrarPorTexto() {
    const texto = document.getElementById('buscador').value.toLowerCase();
    const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(texto) || 
        p.descripcion.toLowerCase().includes(texto)
    );
    renderizarProductos(filtrados);
}

// Funciones del Carrito
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    const itemExistente = carrito.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    guardarCarrito();
    actualizarCarritoUI();
    mostrarNotificacion(`Agregaste "${producto.nombre}" al carrito`);
}

function cambiarCantidad(id, cambio) {
    const item = carrito.find(i => i.id === id);
    if (!item) return;

    item.cantidad += cambio;
    if (item.cantidad <= 0) {
        carrito = carrito.filter(i => i.id !== id);
    }

    guardarCarrito();
    actualizarCarritoUI();
}

function guardarCarrito() {
    localStorage.setItem('onix_carrito', JSON.stringify(carrito));
}

function actualizarCarritoUI() {
    const lista = document.getElementById('lista-carrito');
    const contador = document.getElementById('contador-carrito');
    const totalEl = document.getElementById('total-carrito');

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    contador.textContent = totalItems;
    totalEl.textContent = `$${totalPrecio.toLocaleString('es-AR')}`;

    if (carrito.length === 0) {
        lista.innerHTML = '<p class="empty-msg">Tu carrito está vacío.</p>';
        document.getElementById('opciones-pago').classList.add('hidden');
        return;
    }

    lista.innerHTML = '';
    carrito.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.nombre}</h4>
                <p>$${(item.precio * item.cantidad).toLocaleString('es-AR')}</p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="cambiarCantidad(${item.id}, -1)">-</button>
                <span>${item.cantidad}</span>
                <button class="qty-btn" onclick="cambiarCantidad(${item.id}, 1)">+</button>
            </div>
        `;
        lista.appendChild(div);
    });
}

function toggleCarrito() {
    document.getElementById('carrito-drawer').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function mostrarOpcionesPago() {
    if (carrito.length === 0) {
        mostrarNotificacion("Agregá al menos un producto primero");
        return;
    }
    document.getElementById('opciones-pago').classList.remove('hidden');
}

// Finalizar Compra (Envía datos a Python si está activo y redirige)
async function procesarCompra(metodo) {
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const pedido = {
        fecha: new Date().toISOString(),
        metodo_pago: metodo,
        total: total,
        items: carrito
    };

    // Intentar registrar la compra en el servidor Python (para actualizar el JSON)
    try {
        await fetch('http://127.0.0.1:5000/registrar-compra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });
    } catch (e) {
        console.log("Modo estático (GitHub Pages): Guardando registro local.");
    }

    if (metodo === 'whatsapp') {
        let mensaje = "¡Hola! Quiero realizar el siguiente pedido:%0A%0A";
        carrito.forEach(item => {
            mensaje += `• ${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString('es-AR')})%0A`;
        });
        mensaje += `%0A*Total: $${total.toLocaleString('es-AR')}*`;
        
        window.open(`https://wa.me/${TELEFONO_WHATSAPP}?text=${mensaje}`, '_blank');
    } else if (metodo === 'mercadopago') {
        window.open(LINK_MERCADOPAGO, '_blank');
    }

    // Limpiar carrito tras confirmar
    carrito = [];
    guardarCarrito();
    actualizarCarritoUI();
    toggleCarrito();
}

function mostrarNotificacion(texto) {
    const toast = document.getElementById('toast');
    toast.textContent = texto;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}