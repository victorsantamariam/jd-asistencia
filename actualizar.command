#!/bin/bash
# Script de 1-clic para actualizar la asistencia J.D.
# Doble clic en Finder para ejecutar
cd "$(dirname "$0")"

echo "=========================================================="
echo "   🔄  SISTEMA J.D. - SINCRONIZACIÓN AUTOMÁTICA EN VIVO"
echo "=========================================================="
echo ""
echo "1. Descargando datos sesión a sesión desde la fuente..."
python3 actualizar_desde_web.py

if [ $? -eq 0 ]; then
  echo ""
  echo "2. Preparando archivos de despliegue para Vercel..."
  node build.js
  
  echo ""
  echo "3. Publicando actualización a GitHub..."
  git add -A
  FECHA=$(date "+%d/%m/%Y %I:%M %p")
  git commit -m "Auto-sync asistencia: $FECHA"
  git push origin main
  
  echo ""
  echo "=========================================================="
  echo "🎉 ¡LISTO! Sincronización y despliegue exitosos."
  echo "🌐 Vercel actualizará tu sitio web en unos 15 segundos en:"
  echo "   https://jd-asistencia.vercel.app"
  echo "=========================================================="
else
  echo "❌ Ocurrió un error al descargar los datos."
fi

echo ""
read -p "Presione [Enter] para cerrar esta ventana..."
