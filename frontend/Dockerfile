FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY script.js /usr/share/nginx/html/script.js
COPY assets /usr/share/nginx/html/assets
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

VOLUME /app

CMD ["nginx", "-g", "daemon off;"]