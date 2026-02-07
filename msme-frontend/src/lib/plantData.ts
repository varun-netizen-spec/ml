import potatoImg from '@/assets/potato.jpg';
import cornImg from '@/assets/corn.jpg';
import appleImg from '@/assets/apple.jpg';
import grapeImg from '@/assets/grape.jpg';
import tomatoImg from '@/assets/tomato.jpg';

export interface PlantInfo {
  id: string;
  name: string;
  emoji: string;
  image: string;
  scientificName: string;
  region: string;
  soil: string;
  nutrients: string;
  optimalTemp: string;
  waterRequirements: string;
}

export const plantData: PlantInfo[] = [
  {
    id: 'potato',
    name: 'Potato',
    emoji: '🥔',
    image: potatoImg,
    scientificName: 'Solanum tuberosum',
    region: 'Temperate regions worldwide - China, India, Russia, Ukraine, USA',
    soil: 'Loose, well-drained soil with a pH of 5.0-6.0. Sandy loam is ideal for tuber development.',
    nutrients: 'High Potassium (K) for tuber quality, moderate Nitrogen (N) for foliage, and Phosphorus (P) for root development. Adequate Calcium and Magnesium are also essential.',
    optimalTemp: '15-20°C (59-68°F) for optimal tuber formation',
    waterRequirements: 'Consistent moisture, 1-2 inches per week. Critical during tuber formation.',
  },
  {
    id: 'corn',
    name: 'Corn',
    emoji: '🌽',
    image: cornImg,
    scientificName: 'Zea mays',
    region: 'Warm temperate and subtropical - USA, China, Brazil, Argentina, India',
    soil: 'Deep, fertile, well-drained soil with a pH of 5.8-7.0. Loamy soil with good organic content.',
    nutrients: 'High Nitrogen (N) requirement for rapid growth, Phosphorus (P) for root development and energy transfer, and Potassium (K) for stalk strength and disease resistance.',
    optimalTemp: '21-27°C (70-81°F) for germination and growth',
    waterRequirements: 'Heavy water requirement, 1-1.5 inches per week. Critical during tasseling and ear formation.',
  },
  {
    id: 'apple',
    name: 'Apple',
    emoji: '🍎',
    image: appleImg,
    scientificName: 'Malus domestica',
    region: 'Temperate regions - USA, China, Poland, Italy, France, Turkey, India (Kashmir)',
    soil: 'Well-drained loamy soil with good organic content. pH of 6.0-7.0 is optimal.',
    nutrients: 'Moderate Nitrogen (N) for vegetative growth, Phosphorus (P) for root and flower development, and Potassium (K) for fruit quality and disease resistance. Calcium is crucial for preventing bitter pit.',
    optimalTemp: '15-24°C (59-75°F) during growing season, requires winter chilling',
    waterRequirements: 'Regular watering, 1-2 inches per week. Critical during fruit development and dry periods.',
  },
  {
    id: 'grape',
    name: 'Grape',
    emoji: '🍇',
    image: grapeImg,
    scientificName: 'Vitis vinifera',
    region: 'Mediterranean and temperate regions - Italy, France, Spain, USA (California), China, Chile, Australia',
    soil: 'Well-drained sandy loam to clay loam soil with a pH of 6.0-7.0. Good drainage is essential to prevent root diseases.',
    nutrients: 'Moderate Nitrogen (N) for vine growth, Phosphorus (P) for root development and fruit set, and Potassium (K) for fruit quality and sugar content. Magnesium and Boron are also important.',
    optimalTemp: '15-30°C (59-86°F) during growing season, cool nights improve fruit quality',
    waterRequirements: 'Moderate water needs, 500-800mm annually. Drip irrigation preferred. Reduce water before harvest to concentrate sugars.',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    emoji: '🍅',
    image: tomatoImg,
    scientificName: 'Solanum lycopersicum',
    region: 'Temperate and subtropical regions - China, India, USA, Turkey, Egypt, Italy, Iran',
    soil: 'Well-drained sandy loam to loamy soil with a pH of 6.0-6.8. Rich in organic matter with good drainage.',
    nutrients: 'High Nitrogen (N) during vegetative stage, high Phosphorus (P) for flowering and fruit set, and high Potassium (K) for fruit development and quality. Calcium prevents blossom end rot.',
    optimalTemp: '21-27°C (70-81°F) for optimal growth and fruit set',
    waterRequirements: 'Consistent moisture, 1-2 inches per week. Regular watering prevents fruit cracking and blossom end rot.',
  },
];
