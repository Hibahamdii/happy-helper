import tomatoImg from "@/assets/crops/tomato.jpg";
import potatoImg from "@/assets/crops/potato.jpg";
import cornImg from "@/assets/crops/corn.jpg";
import sunflowerImg from "@/assets/crops/sunflower.jpg";
import wheatImg from "@/assets/crops/wheat.jpg";
import pepperImg from "@/assets/crops/pepper.jpg";
import cucumberImg from "@/assets/crops/cucumber.jpg";
import carrotImg from "@/assets/crops/carrot.jpg";
import soybeanImg from "@/assets/crops/soybean.jpg";
import broccoliImg from "@/assets/crops/broccoli.jpg";
import riceImg from "@/assets/crops/rice.jpg";
import oliveImg from "@/assets/crops/olive.jpg";
import citrusImg from "@/assets/crops/citrus.jpg";
import cottonImg from "@/assets/crops/cotton.jpg";

const CROP_IMAGES: Record<string, string> = {
  tomato: tomatoImg,
  potato: potatoImg,
  corn: cornImg,
  sunflower: sunflowerImg,
  wheat: wheatImg,
  pepper: pepperImg,
  cucumber: cucumberImg,
  carrot: carrotImg,
  soybean: soybeanImg,
  broccoli: broccoliImg,
  rice: riceImg,
  olive: oliveImg,
  citrus: citrusImg,
  cotton: cottonImg,
};

export function getCropImage(cropType: string): string {
  return CROP_IMAGES[cropType] || wheatImg;
}
