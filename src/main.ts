import App from './index.ts';

import './style.scss';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
   <canvas id="webgl" width="800" height="600"></canvas>
  </div>
`;

let app: App | null = null;

const onMounted = () => {
  const canvas = document.querySelector<HTMLCanvasElement>('#webgl')!;

  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }

  app = new App(canvas);
  app.render(0);

  window.addEventListener("resize", () => {
    if (!app) return;
    app.resize();
  });
};

window.addEventListener('DOMContentLoaded', onMounted);