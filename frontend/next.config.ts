/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // Quando o usuário acessar a home "/"
        source: '/',
        // Ele será mandado para o login
        destination: '/login',
        // 'permanent: true' diz aos buscadores que essa mudança é definitiva (melhor para SEO)
        permanent: true,
      },
    ]
  },
};

export default nextConfig;