# Obsidian Audio Plugin Manager

Este plugin para Obsidian te permite administrar tus plugins de audio (VST, DLL, etc.) directamente desde Obsidian. Integra la funcionalidad de un script de PowerShell para escanear, comprimir y catalogar plugins de audio, con una interfaz gráfica completa.

## Características

- 🔍 **Escaneo de Plugins**: Busca archivos de plugin en carpetas configuradas
- 📦 **Compresión Automática**: Crea archivos ZIP para cada plugin
- 📋 **Catálogo Completo**: Genera un índice de todos tus plugins
- 📝 **Notas Automáticas**: Crea una nota en Obsidian por cada plugin encontrado
- 🔎 **Búsqueda y Filtrado**: Encuentra fácilmente tus plugins por nombre, desarrollador o formato
- 🖥️ **Interfaz Gráfica**: Administra todo desde una interfaz visual en Obsidian

## Instalación

1. Descarga el ZIP más reciente de la página de Releases
2. Descomprime el archivo y copia la carpeta a tu carpeta de plugins de Obsidian
   - Ubicación en Windows: `C:\Users\USERNAME\AppData\Roaming\obsidian\plugins`
   - Ubicación en macOS: `~/Library/Application Support/obsidian/plugins`
   - Ubicación en Linux: `~/.obsidian/plugins`
3. Activa el plugin desde Configuración > Plugins de Comunidad > Audio Plugin Manager

## Uso

### Configuración Inicial

1. Ve a Configuración > Audio Plugin Manager
2. Establece la carpeta principal donde se encuentran tus plugins de audio
3. Configura las extensiones de archivo que quieres incluir en los escaneos
4. Define carpetas a ignorar durante el escaneo
5. Habilita o deshabilita la generación automática de notas para cada plugin
6. Establece la carpeta donde se guardarán las notas de plugins

### Escaneo de Plugins

1. Haz clic en el icono de audio en la barra lateral
2. Presiona el botón "Escanear Plugins"
3. Espera a que se complete el proceso

### Navegación de Plugins

- Usa la barra de búsqueda para encontrar plugins específicos
- Filtra por desarrollador o formato usando los menús desplegables
- Haz clic en un desarrollador para expandir y ver todos sus plugins
- Haz clic en el icono de nota para abrir o crear una nota del plugin
- Haz clic en el icono de carpeta para abrir la ubicación del archivo ZIP

## Requisitos

- Obsidian v0.15.0 o superior
- Windows (para ejecutar PowerShell)
- Permisos para ejecutar scripts de PowerShell

## Contribución

Las contribuciones son bienvenidas. Puedes:

1. Hacer fork del repositorio
2. Crear una rama para tu característica (`git checkout -b feature/nueva-caracteristica`)
3. Hacer commit de tus cambios (`git commit -am 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear un Pull Request

## Licencia

Este proyecto está licenciado bajo la licencia MIT - ver el archivo LICENSE para más detalles.
