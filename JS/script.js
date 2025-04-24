window.onload = () => {
  const anio = document.getElementById("anio");
  const current = new Date().getFullYear();
  for (let i = 0; i < 10; i++) {
    const y = current + i;
    const opt = document.createElement("option");
    opt.value = y.toString().slice(-2);
    opt.textContent = y;
    anio.appendChild(opt);
  }
};

// Mostrar/ocultar fecha manual
document.getElementById('randomFecha').addEventListener('change', function () {
  document.getElementById('manualFecha').style.display = this.checked ? 'none' : 'block';
});

function algoritmoLuhn(numero) {
  numero = numero.replace(/\s+/g, '');
  let suma = 0;
  let invertir = numero.split('').reverse();
  for (let i = 0; i < invertir.length; i++) {
    let digito = parseInt(invertir[i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
  }
  return suma % 10 === 0;
}

async function obtenerInfoBIN(bin, cache) {
  if (cache[bin]) return cache[bin]; // Usar caché si ya existe

  const urlBinList = `https://lookup.binlist.net/${bin}`; // URL de BinList

  try {
    const respuesta = await fetch(urlBinList);
    if (!respuesta.ok) {
      throw new Error(`Error al consultar BinList para el BIN ${bin}`);
    }
    const datos = await respuesta.json();
    const datosEstandarizados = {
      bank: datos.bank ? datos.bank.name : 'Desconocido',
      country: datos.country ? datos.country.name : 'Desconocido',
      type: datos.type || 'Desconocido',
      brand: datos.scheme || 'Desconocido',
    };
    cache[bin] = datosEstandarizados; // Guardar en caché
    return datosEstandarizados;
  } catch (error) {
    console.error(`Error al obtener información del BIN (${bin}):`, error);
    return null;
  }
}

document.getElementById('btn-validar').addEventListener('click', async () => {
  const input = document.getElementById('tarjeta').value;
  const tarjetas = input.split(/\r?\n|,/).map(t => t.trim()).filter(t => t.length > 0);

  const cache = {}; // Caché para almacenar consultas del BIN
  const resultados = await Promise.all(tarjetas.map(async (t) => {
    const numeroTarjeta = t.includes('|') ? t.split('|')[0] : t; // Detectar formato con "|"
    const bin = numeroTarjeta.slice(0, 6); // Los primeros 6 dígitos son el BIN
    const esValida = algoritmoLuhn(numeroTarjeta);

    let infoBIN = '';
    const datosBIN = await obtenerInfoBIN(bin, cache);
    if (datosBIN) {
      infoBIN = `Banco: ${datosBIN.bank}, País: ${datosBIN.country}, Tipo: ${datosBIN.type}, Marca: ${datosBIN.brand}`;
    } else {
      infoBIN = 'Información del BIN no disponible. Intenta con otro BIN.';
    }

    return `${t} → ${esValida ? '✅ Válida' : '❌ Inválida'} | ${infoBIN}`;
  }));

  document.getElementById('resultado').textContent = resultados.join('\n');
});

document.getElementById('btn-generar').addEventListener('click', () => {
  const bin = document.getElementById('bin').value;
  const cantidad = parseInt(document.getElementById('cantidad').value);
  const usarAleatorio = document.getElementById('randomFecha').checked;
  const mesInput = document.getElementById('mes').value;
  const anioInput = document.getElementById('anio').value;

  if (!bin || bin.length < 6 || bin.length > 15) {
    alert("Por favor ingrese un BIN válido.");
    return;
  }

  if (!usarAleatorio && (!mesInput || !anioInput)) {
    alert("Por favor seleccione el mes y año si no desea usar fecha aleatoria.");
    return;
  }

  let tarjetas = [];

  for (let i = 0; i < cantidad; i++) {
    let base = bin;
    while (base.length < 15) {
      base += Math.floor(Math.random() * 10);
    }

    let suma = 0;
    for (let j = 0; j < 15; j++) {
      let digito = parseInt(base.charAt(14 - j));
      if (j % 2 === 0) {
        digito *= 2;
        if (digito > 9) digito -= 9;
      }
      suma += digito;
    }

    let ultimo = (10 - (suma % 10)) % 10;
    let tarjeta = base + ultimo;

    let mes, anio;
    if (usarAleatorio) {
      mes = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      anio = String(new Date().getFullYear() + Math.floor(Math.random() * 6)).slice(-2);
    } else {
      mes = mesInput;
      anio = anioInput;
    }

    let cvv = Math.floor(100 + Math.random() * 900);
    tarjetas.push(`${tarjeta}|${mes}|${anio}|${cvv}`);
  }

  document.getElementById('lista').textContent = tarjetas.join('\n');
});

document.getElementById('btn-descargar').addEventListener('click', () => {
  const texto = document.getElementById('lista').textContent;
  const blob = new Blob([texto], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tarjetas_generadas.txt';
  a.click();
  URL.revokeObjectURL(url);
});
