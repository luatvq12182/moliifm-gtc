# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Biến môi trường Azure Speech được "đóng cứng" vào bundle JS ngay lúc build
# (Vite inline mọi biến VITE_* vào file JS tĩnh, không đọc được khi container
# đã chạy — khác với biến môi trường runtime thông thường).
ARG VITE_AZURE_KEY
ARG VITE_AZURE_REGION
ENV VITE_AZURE_KEY=$VITE_AZURE_KEY
ENV VITE_AZURE_REGION=$VITE_AZURE_REGION

RUN npm run build

# ---- Production stage ----
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]