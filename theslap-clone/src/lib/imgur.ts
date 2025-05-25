// src/lib/imgur.ts
import axios from 'axios';
import FormData from 'form-data'; // Importa a classe FormData do pacote form-data

const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

export async function uploadToImgur(imageBase64: string): Promise<string | null> {
  if (!IMGUR_CLIENT_ID) {
    console.error('Imgur Client ID not configured.');
    // Em um cenário real, você poderia lançar um erro aqui para ser tratado pela API chamadora.
    return null;
  }

  try {
    // A API do Imgur espera o base64 puro, sem o prefixo "data:image/...;base64,"
    const pureBase64 = imageBase64.substring(imageBase64.indexOf(',') + 1);

    // Usando a classe FormData importada
    const formData = new FormData();
    formData.append('image', pureBase64);
    formData.append('type', 'base64'); // Especifica que o tipo de dado é base64

    const response = await axios.post('https://api.imgur.com/3/image', formData, {
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        ...formData.getHeaders(), // Necessário para o pacote form-data definir o Content-Type corretamente
      },
    });

    if (response.data.success) {
      return response.data.data.link; // URL da imagem no Imgur
    } else {
      console.error('Imgur API error:', response.data.data.error);
      return null;
    }
  } catch (error: any) {
    // Log mais detalhado do erro
    if (error.response) {
      // A requisição foi feita e o servidor respondeu com um status code fora do range 2xx
      console.error('Error uploading to Imgur - Response Data:', error.response.data);
      console.error('Error uploading to Imgur - Response Status:', error.response.status);
      console.error('Error uploading to Imgur - Response Headers:', error.response.headers);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Error uploading to Imgur - No response:', error.request);
    } else {
      // Algo aconteceu ao configurar a requisição que acionou um erro
      console.error('Error uploading to Imgur - Request setup error:', error.message);
    }
    return null;
  }
}