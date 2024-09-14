# Utilizar la imagen base de Nginx
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el archivo HTML en el directorio de Nginx
COPY index.html /usr/share/nginx/html/index.html

# Exponer el puerto 80 para Nginx
EXPOSE 80

# Comando por defecto para ejecutar Nginx
CMD ["nginx", "-g", "daemon off;"]