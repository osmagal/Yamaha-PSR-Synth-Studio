# Synth Studio

Uma estação de trabalho de áudio digital (DAW) baseada em navegador, projetada para performance em tempo real, sound design e exploração musical.

**Link em Produção:** [https://synth-studio-xi.vercel.app/](https://synth-studio-xi.vercel.app/)

## 🚀 Arquitetura e Implementação

Este projeto foi construído com foco em alta performance e fidelidade sonora, utilizando tecnologias modernas de áudio e interface.

### 🎼 Engine de Áudio (Core)
O coração da aplicação é a classe `SynthEngine`, construída sobre a biblioteca **Tone.js**.

- **Motores de Síntese:**
  - **Subtrativa (PolySynth):** Utiliza osciladores tradicionais (sawtooth, square, pulse) com filtragem de alta ordem.
  - **FM (Frequency Modulation):** Sintetizador FM polifônico para timbres metálicos e elétricos.
  - **AM (Amplitude Modulation):** Utilizado para pads atmosféricos e texturas orgânicas.
  - **Sampler:** Motor de amostragem de alta qualidade que carrega o lendário piano *Salamander* e kits de bateria eletrônica.
- **Cadeia de Sinal Dinâmica:**
  - `Source -> Distortion -> Chorus -> Feedback Delay -> Reverb -> 24dB/oct Lowpass Filter -> Master Volume`.
  - Inclui um **Modulation Matrix** com LFO para vibrato e efeitos de movimento.
  - **Envelope de Filtro:** Um envelope ADSR dedicado que modula a frequência de corte (cutoff) de forma dinâmica.

### 💻 Frontend & UI/UX
- **React 18 + TypeScript:** Tipagem rigorosa em toda a aplicação para garantir estabilidade no fluxo de dados de áudio.
- **Tailwind CSS:** Interface moderna, "dark theme" de alto contraste, inspirada em hardware clássico de estúdio.
- **Motion (Framer Motion):** Animações fluidas para transições de interface, feedbacks visuais e estados de componentes.
- **Componentes Customizados:**
  - **Knobs de Precisão:** Controles rotativos virtuais que suportam arraste de mouse e gestos de toque no mobile.
  - **Envelope Editor Visual:** Um editor SVG interativo que permite ajustar visualmente as curvas ADSR do som.
  - **Osciloscópio Real-time:** Visualização de forma de onda em tempo real processando dados do `Tone.Analyser`.

### 🎹 Conectividade & Performance
- **Web MIDI API:** Integração nativa com controladores MIDI USB. Suporta mensagens de Note On/Off, Pitch Bend e Modulation Wheel.
- **Arpeggiador Programável:** Sincronizado com o clock interno, permitindo padrões (Up, Down, Random) com divisões rítmicas variadas.
- **Metrônomo Profissional:** Com detecção de "downbeat" e controle de BPM preciso.
- **Persistência Local:** Sistema de presets customizados salvos via `localStorage`, permitindo que o usuário crie e recupere seus próprios patches de som.

### 📱 Responsividade
A aplicação foi otimizada para desktops e dispositivos móveis:
- Layout de grade adaptativo que reorganiza os racks de controle.
- Menu lateral (Preset Browser) ocultável no mobile para maximizar a área de controle.
- Otimização de eventos de toque (Touch Events) nos editores visuais e controles rotativos.

---

### 🛠️ Tecnologias Utilizadas
- **React**
- **TypeScript**
- **Tone.js**
- **Lucide React** (Ícones)
- **Framer Motion** (Animações)
- **Vite** (Build Tool)

---
Desenvolvido com foco em levar a experiência de um sintetizador de hardware para o ambiente web moderno.
