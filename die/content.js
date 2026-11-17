// All site content. Every section, list, marker and panel is built from this file.
const img = (src, alt, caption = '') => ({ type: 'img', src, alt, caption });
const vid = (src, poster, alt, caption = '') => ({ type: 'video', src, poster, alt, caption });
const link = (label, href) => ({ label, href });

export const PERSON = {
  name: 'Arihan Yadav',
  email: 'apyadav@wisc.edu',
  linkedin: 'https://linkedin.com/in/arihanyadav',
  github: 'https://github.com/Air-crypto',
  resume: 'assets/arihan-yadav-resume.pdf',
};

// Groups map to blocks on the die. Order is the scroll order.
export const GROUPS = {
  about: { label: 'About', index: '01', hue: '#cfd8ff' },
  work: { label: 'Work', index: '02', hue: '#73d9ff' },
  projects: { label: 'Projects', index: '03', hue: '#ffa565' },
  life: { label: 'Life', index: '04', hue: '#ff86b8' },
  io: { label: 'Contact', index: '05', hue: '#8dffc4' },
};

export const ITEMS = [
  // About
  {
    id: 'me', group: 'about', title: 'Hey, I’m Arihan.', short: 'About me',
    kicker: 'San Francisco / New York', date: 'UW–Madison · Dec 2026',
    body: [
      'I’m studying Computer Engineering and Computer Science at the University of Wisconsin–Madison, graduating in December 2026.',
      'Most of my work is somewhere between machine learning, software, and hardware. At AMD, I work on training language models for device code generation, along with the kernels and distributed systems that make that training possible.',
      'Outside of that, there’s ice hockey, rock climbing, hiking, photos from flights, and a lot of Madison. A frozen lake is a ton of fun. An electric skateboard on ice, less so :].',
    ],
    media: [
      img('thumbs/selfie.jpg', 'Arihan on campus'),
      img('thumbs/hockey-IMG_719811.jpg', 'Practicing a hockey stop'),
      img('thumbs/madison-IMG_7183.jpg', 'A meal with friends in Madison'),
      img('thumbs/flights-IMG_9357.jpg', 'A view from a window seat'),
    ],
  },
  {
    id: 'education', group: 'about', title: 'University of Wisconsin–Madison', short: 'Education',
    kicker: 'B.S. Computer Engineering · Double major: Computer Sciences', date: 'Expected Dec 2026',
    body: [
      'Selected coursework: AI-Assisted Software Development, World Models, System Architecture for Quantum Computers, Matrix Methods in Machine Learning, Artificial Neural Networks, Operating Systems, System Synthesis and Design, Data Structures and Algorithms, Database Design and Management, Machine Organization and Programming, Random Signal Analysis and Statistics, Signals, Information, and Computation, Circuit Analysis.',
    ],
  },
  {
    id: 'stack', group: 'about', title: 'What I work with', short: 'Stack',
    kicker: 'Languages · frameworks · systems', date: '',
    tags: ['Python', 'C++', 'C', 'Go', 'Java', 'JavaScript', 'Verilog', 'SystemVerilog', 'Assembly', 'MATLAB', 'SQL',
      'PyTorch', 'JAX', 'TensorFlow', 'ROCm', 'HIP', 'CUDA', 'vLLM', 'MLIR', 'LibTorch', 'LangChain', 'LlamaIndex', 'Flask', 'AWS OpenSearch', 'Docker', 'ROS'],
    body: ['Honed through coursework, research, and production work across ML, systems, and hardware.'],
  },
  {
    id: 'patent', group: 'about', title: 'Computer Vision Methods and Systems for Sign Language to Text/Speech', short: 'Patent',
    kicker: 'USPTO Application No. 17865379', date: 'Patent',
    body: ['A low-latency inference system that translates American Sign Language hand gestures into text. The full pipeline recognizes a gesture in under 32 ms with over 99.71% accuracy.'],
    links: [link('View on Google Scholar', 'https://scholar.google.com/citations?view_op=view_citation&hl=en&user=9G0W7UMAAAAJ&citation_for_view=9G0W7UMAAAAJ:u5HHmVD_uO8C')],
    related: 'projects/asl',
  },
  {
    id: 'activities', group: 'about', title: 'Activities', short: 'Activities',
    kicker: 'Outside the lab', date: '',
    list: ['USA Computing Olympiad · Gold Division', 'Conrad Business Challenge · International Runner Up', 'Wisconsin Robotics', 'Hoofer Ski and Snowboard Club', 'Asian American Student Union'],
    body: [],
  },

  // Work
  {
    id: 'work/amd', group: 'work', title: 'Post-training LLMs with reinforcement learning', short: 'AMD · LLM post-training',
    org: 'AMD', role: 'AI Engineer 1 (Contractor)', date: 'May 2026 – Present', year: '2026',
    stat: { value: '12K', label: 'tokens per solution, vs 102K for Opus and 360K for GPT' },
    chips: ['GSPO + RLVR', '16× MI250', '8× context', '2 papers'],
    body: [
      'Built an end-to-end post-training pipeline to specialize a base model for proprietary device code generation: continued pretraining on the target codebase, supervised fine-tuning on reasoning traces and tool-use trajectories distilled from a larger teacher, then reinforcement learning with GSPO and verifiable rewards (RLVR).',
      'Trained a model that passed more directed device tests than GPT and Claude Opus while generating solutions in under 12,000 tokens. Engineered a fused cross-entropy kernel with near-constant memory as sequence length grows, enabling an 8× larger training context window.',
      'Architected distributed training and inference across 16 MI250 GPUs on two 8-GPU clusters over RCCL, with a dedicated training server and a vLLM inference server using speculative decoding. Synchronized policy weights every three steps, and measured reward hacking and grader exploitation to harden the reward and grading infrastructure.',
      'First author of two papers at AMD’s Global Technical Authors Conference on the RL methodology and the harnesses used to train and evaluate models.',
    ],
  },
  {
    id: 'work/amd-intern', group: 'work', title: 'AI for hardware verification', short: 'AMD · hardware traces',
    org: 'AMD', role: 'AI/ML Intern', date: 'May – Aug 2025', year: '2025',
    stat: { value: '82%', label: 'root-cause accuracy, vs 28% for state of the art' },
    chips: ['30× faster verification', '97K tx/s', '22× context', '4.6× training'],
    body: [
      'Designed an AI pipeline for root-cause analysis of hardware traces, clustering failures by root cause instead of error signature. 82% accuracy against 28% for state-of-the-art systems, cutting verification time and resources by 30×.',
      'Built a data pipeline from a Dremio data lake to a GPU cluster that processed 97,000 transactions per second on a 3.5B-trace corpus at near-linear scale. Moved the model from hierarchical full attention to sliding-window attention to cut long-sequence memory while keeping causality.',
      'Used QLoRA 4-bit training, found through ablations, to grow the context window 22× (512 to 11,000 tokens) for a 54% accuracy gain. Added layer-frozen fine-tuning to adapt quickly to new CPU and GPU chip families.',
      'Ported the pipeline from Python to C++ with LibTorch and pybind11, fusing hot paths and custom HIP kernels: 4.6× faster training and 3× faster inference. First author of a paper at AMD’s Global Technical Authors Conference.',
    ],
  },
  {
    id: 'work/arlis', group: 'work', title: 'Multimodal search for the Department of Defense', short: 'ARLIS · multimodal RAG',
    org: 'ARLIS', role: 'Researcher', date: 'Nov 2024 – Present', year: '2024',
    stat: { value: '94.5%', label: 'image–caption retrieval accuracy, vs 35.8% for CLIP' },
    chips: ['99.93% top-5', '0.970 MRR', 'text · image · audio · video'],
    body: [
      'Lead developer working with the DoD through ARLIS on context-aware multimodal retrieval that combines LLMs with retrieval-augmented generation, across text, images, audio, and video, for naval assets, declassification workflows, and other defense use cases.',
      'Architected and trained a PyTorch model that aligns heterogeneous embeddings into one semantic space, with specialized contrastive losses and cross-attention between projected image, audio, video, and text features.',
    ],
  },
  {
    id: 'work/research', group: 'work', title: 'Medical image retrieval with multimodal models', short: 'UW–Madison · MIMRTL',
    org: 'UW–Madison MIMRTL', role: 'Undergraduate Researcher', date: 'Jan 2024 – Present', year: '2024',
    stat: { value: '+58%', label: 'retrieval accuracy over BM25 and Sentence Transformers' },
    chips: ['with Microsoft', 'patent filed', '−41.6% memory'],
    body: [
      'Working with researchers at Microsoft to better align CT and MRI embeddings for multimodal LLMs, in the Molecular Imaging/Magnetic Resonance Technology Lab.',
      'Built a multimodal projection model in PyTorch that maps pseudocode embeddings to C code embeddings, improving retrieval accuracy by 58.2%. Published as primary author; UW–Madison filed a patent on it.',
      'Cut LLaVA fine-tuning memory by 41.6% (212 GB to 124 GB) with distributed training across 80 GB A100s, gradient checkpointing, and mixed precision.',
    ],
  },
  {
    id: 'work/theom', group: 'work', title: 'Access control for LLMs with vector search', short: 'Theom · vector search',
    org: 'Theom', role: 'Software Developer Intern', date: 'Jun – Dec 2024', year: '2024',
    stat: { value: '10×', label: 'faster data classification' },
    chips: ['+572% traceability', '5 vector DBs', 'C++ · SQL · OpenSearch'],
    body: [
      'Built a Flask RAG service with fine-grained access control across Pinecone, OpenSearch, Milvus, Chroma, and MongoDB, so similarity search respects the querier’s identity, context, and policies.',
      'Implemented semantic search in C++, SQL, and AWS OpenSearch that beat fuzzy hashing: 10× faster classification and 572% better data traceability.',
    ],
  },
  {
    id: 'work/robotics', group: 'work', title: 'Sensor fusion for autonomous navigation', short: 'Wisconsin Robotics',
    org: 'Wisconsin Robotics', role: 'Team Member', date: 'Sep 2023 – Present', year: '2023',
    stat: { value: '−34%', label: 'navigation error' },
    chips: ['+26% path planning', 'LiDAR + camera', 'ROS · Docker'],
    body: [
      'Developed sensor-fusion trajectory models combining LiDAR and camera data for vehicles on real-time systems: 34% fewer navigation errors and 26% more efficient path planning.',
      'Containerized the stack with Docker and ROS to connect software to the robots.',
    ],
  },

  // Projects
  {
    id: 'projects/simd', group: 'projects', title: 'VLIW SIMD processor optimization', short: 'VLIW / SIMD',
    date: 'Feb 2026', year: '2026', tags: ['Architecture', 'Scheduling'],
    stat: { value: '110.6×', label: 'speedup, 147,734 → 1,336 cycles' },
    body: [
      'Optimized a VLIW SIMD processor simulator kernel from 147,734 cycles to 1,336, a 110.6× speedup that beat Claude Opus 4.5’s best of 1,363 cycles.',
      'Selective tree-node preloading removed 87% of memory loads through nested vselect multiplexers, and a dependency-aware VLIW scheduler detects hazards to maximize parallel issue.',
    ],
  },
  {
    id: 'projects/ebike', group: 'projects', title: 'FPGA-based eBike controller', short: 'eBike controller',
    date: 'Feb – May 2025', year: '2025', tags: ['SystemVerilog', 'FPGA'],
    stat: { value: '400 MHz', label: 'with 0.3 ns setup slack' },
    body: [
      'A battery-efficient digital eBike controller in SystemVerilog: PID motor drive, SPI interfaces, exponential averaging filters, inertial sensor fusion, and UART telemetry.',
      'Pipelining and synthesis tuning met a 400 MHz clock with 0.3 ns of setup slack and shrank area from 20k μm² to 13k μm². Constrained-random testbenches, then onto an FPGA mounted on a bike.',
    ],
    media: [
      img('thumbs/projects-ebike_synth_test.jpg', 'Post-synthesis tests passing', 'First pass of post-synthesis tests, at 2am.'),
      vid('projects/ebike_run_vid.mp4', 'thumbs/projects-ebike_run_vid-poster.jpg', 'The synthesized controller running on an FPGA', 'Running on an FPGA testbench.'),
    ],
  },
  {
    id: 'projects/quantum', group: 'projects', title: 'Quantum error mitigation with GNNs', short: 'Quantum error mitigation',
    date: 'Mar – May 2025', year: '2025', tags: ['JAX', 'GNN', 'TPU'],
    stat: { value: '267%', label: 'error reduction on unseen circuit structures' },
    body: [
      'A graph neural network in JAX trained on Google TPUs over 6,800+ quantum circuits: 1,800 fuzzed MQT benchmarks and 5,000 random QAOA circuits.',
      'It generalizes to structurally different circuits with a 267% error reduction. Green is ours and red is uncorrected; on the scatter, y = x is the noiseless truth.',
    ],
    media: [
      img('thumbs/projects-GNN_histogram.jpg', 'Histogram of circuit errors'),
      img('thumbs/projects-GNN_scatter.jpg', 'Scatterplot of corrected circuit errors'),
    ],
  },
  {
    id: 'projects/kernel', group: 'projects', title: 'Multithreaded kernel scheduler', short: 'Kernel scheduler',
    date: 'Oct – Nov 2024', year: '2024', tags: ['C', 'xv6', 'OS'],
    stat: { value: 'xv6', label: 'stride scheduling with dynamic tickets' },
    body: [
      'A stride scheduler in the xv6 kernel that keeps I/O-heavy processes responsive without starving CPU-bound ones, using ticket-based priority.',
      'Semaphores protect shared state, and custom system calls adjust tickets at runtime.',
    ],
  },
  {
    id: 'projects/guitar', group: 'projects', title: 'Verilog guitar tuner on an FPGA', short: 'Guitar tuner',
    date: 'Feb – Apr 2024', year: '2024', tags: ['Verilog', 'DE2-115'],
    stat: { value: '+67%', label: 'clock, 50 → 83.3 MHz' },
    body: [
      'Real-time tuner on a DE2-115: FSM-based frequency detection, pushbutton synchronizers, and subtraction circuits for pitch analysis.',
      'Pipeline registers on critical paths cut combinational delay from 17 ns to 9 ns. Got it working at 4am; a friend picked up Domino’s at 2am.',
    ],
    media: [
      vid('projects/IMG_7213.mp4', 'thumbs/projects-IMG_7213-poster.jpg', 'Testing the guitar tuner on the FPGA'),
      img('thumbs/projects-IMG_0003.jpg', 'Multiplier with a pipeline register'),
      img('thumbs/projects-IMG_7214.jpg', 'A friend picking up pizza at 2am'),
    ],
  },
  {
    id: 'projects/gradients', group: 'projects', title: 'Least squares classifier from scratch', short: 'Gradient descent',
    date: 'Mar 2024', year: '2024', tags: ['Math', 'Optimization'],
    stat: { value: '∇', label: 'gradients derived by hand' },
    body: [
      'Derived the gradients and wrote gradient descent for a binary least squares classifier, with no ML libraries: cost, gradient, and updates by hand.',
      'The first plot is from a missing negative sign, which was funny. The last is the trained result.',
    ],
    media: [
      img('thumbs/projects-IMG_0126.jpg', 'Training plot with a sign error'),
      img('thumbs/projects-IMG_7169.jpg', 'Gradient descent training plot'),
      img('thumbs/projects-IMG_7168.jpg', 'Trained classifier result'),
    ],
  },
  {
    id: 'projects/led', group: 'projects', title: 'LED controller', short: 'LED controller',
    date: 'May 2024', year: '2024', tags: ['Circuits', 'Oscilloscope'],
    stat: { value: 'Δt', label: 'state transitions on the scope' },
    body: ['A potentiometer, button, and switch control flashing frequency and color mixing. An oscilloscope measured the delay from button press to color change.'],
    media: [
      img('thumbs/projects-IMG_7054.jpg', 'The LED controller circuit'),
      img('thumbs/projects-IMG_7079.jpg', 'Oscilloscope trace of a state transition'),
    ],
  },
  {
    id: 'projects/acoustic', group: 'projects', title: 'Acoustic keylogging', short: 'Acoustic keylogging',
    date: 'Aug 2023', year: '2023', tags: ['CNN', 'Audio', 'Security'],
    stat: { value: '⌨', label: 'keystrokes from sound' },
    body: ['Keyboards leave acoustic signatures. Using spectrograms and CNNs on frequency, timing, and amplitude, this predicts which key was pressed from audio alone.'],
    links: [link('Read the article', 'https://medium.com/@arihanairyadav/acoustic-keylogging-the-next-type-of-keyboard-eavesdropping-2a71d5b1d934')],
  },
  {
    id: 'projects/video', group: 'projects', title: 'Violence detection in video', short: 'Video understanding',
    date: 'Aug 2023', year: '2023', tags: ['CNN', 'BiLSTM'],
    stat: { value: '93.6%', label: 'validation accuracy' },
    body: ['CNNs extract spatial features and a bidirectional LSTM tracks how they change across frames. Trained on the Real Life Violence Situations dataset.'],
    links: [link('Read the article', 'https://medium.com/@arihanairyadav/detecting-violence-in-videos-using-machine-learning-8e541cf146a1')],
  },
  {
    id: 'projects/asl', group: 'projects', title: 'ASL translator', short: 'ASL translator',
    date: 'Feb 2022', year: '2022', tags: ['Mediapipe', 'YOLOv3', 'Patent'],
    stat: { value: '<32 ms', label: 'per gesture at 99.71% accuracy' },
    body: [
      'Translates ASL to text with just a camera. Background clutter is removed, hand landmarks become a wireframe, and a YOLOv3 model returns the gesture as text.',
      'I filed a patent on the approach.',
    ],
    media: [img('thumbs/projects-IMG_0001.jpg', 'Hand landmark wireframe')],
    links: [link('GitHub', 'https://github.com/Air-crypto/ASLAPPV1'), link('Universal Messaging Technology', 'https://www.universalmessage.org/technology')],
    related: 'patent',
  },
  {
    id: 'projects/website', group: 'projects', title: 'This website', short: 'This website',
    date: '2026', year: '2026', tags: ['three.js', 'WebGL'],
    stat: { value: '1', label: 'scene, no page loads' },
    body: ['Hand-written HTML, CSS, and JavaScript with three.js. The whole site is one silicon die: every block, trace, and marker is a piece of my work.'],
    links: [link('Source code', 'https://github.com/Air-crypto/Air-crypto.github.io'), link('The previous version (a tree)', 'tree.html')],
  },

  // Life
  {
    id: 'life/skating', group: 'life', title: 'On the ice', short: 'On the ice', date: '2023 – 2024',
    body: ['Practicing the hockey stop. Almost there; working on angling the back foot. Ice spray looking pretty good though.'],
    media: [
      vid('hockey/IMG_71981.mp4', 'thumbs/hockey-IMG_71981-poster.jpg', 'Hockey stop practice'),
      vid('hockey/IMG_71991.mp4', 'thumbs/hockey-IMG_71991-poster.jpg', 'Hockey stop practice'),
      img('thumbs/hockey-IMG_719811.jpg', 'Practicing a hockey stop'),
      img('thumbs/hockey-IMG_719911.jpg', 'Practicing a hockey stop'),
      img('thumbs/hockey-IMG_7026.jpg', 'Skates covered in snow', 'Mar 8, 2024'),
      img('thumbs/hockey-IMG_7027.jpg', 'Skates covered in snow'),
      img('thumbs/hockey-IMG_6571.jpg', 'Public skate night', 'Nov 11, 2023'),
      img('thumbs/hockey-IMG_0196.jpg', 'Public skate night'),
    ],
  },
  {
    id: 'life/flights', group: 'life', title: 'Window seats', short: 'Window seats', date: 'Ongoing',
    body: ['A small but growing collection, only updated when I get the window. The first one reminds me of “Spittin’ off the Edge of the World”.'],
    media: [img('thumbs/flights-IMG_9357.jpg', 'View from a flight'), img('thumbs/flights-IMG_9722.jpg', 'View from a flight'), img('thumbs/flights-IMG_9726.jpg', 'View from a flight')],
  },
  {
    id: 'life/madison', group: 'life', title: 'Around Madison', short: 'Madison', date: '2023 – now',
    body: ['A frozen lake is a ton of fun. Pro tip: don’t ride an electric skateboard on it. Also swam in Lake Mendota on May 10, 2024; bring a towel (I didn’t).'],
    media: ['7043', '7045', '7162', '0569', '1145', '6490', '6623', '6928', '6929', '6940', '7183', '7187', '7242', '7247']
      .map(n => img(`thumbs/madison-IMG_${n}.jpg`, n === '7242' || n === '7247' ? 'Swimming in Lake Mendota' : 'Around Madison')),
  },
  {
    id: 'life/aurora', group: 'life', title: 'Northern lights', short: 'Northern lights', date: 'May 10, 2024',
    body: ['From the UW–Madison campus at the Porter Boathouse dock and Memorial Union Terrace. K-index 9, visible to the naked eye. 5–10 second exposures on an iPhone 15 Pro.'],
    media: ['7288', '7289', '7290', '7298'].map(n => img(`thumbs/aurora-IMG_${n}.jpg`, 'Northern lights over Madison')),
  },
  {
    id: 'life/sf', group: 'life', title: 'SF on the Fourth', short: 'SF on the Fourth', date: 'Jul 4, 2025',
    body: ['Pictures from the Bay on Independence Day.'],
    media: ['9375', '9403', '9437'].map(n => img(`thumbs/july4_SF-IMG_${n}.jpg`, 'San Francisco Bay on July 4')),
  },
  {
    id: 'life/eclipse', group: 'life', title: 'The eclipse', short: 'The eclipse', date: 'Apr 8, 2024',
    body: ['From Memorial Union Terrace, 90–95% totality. One shot is through eclipse glasses.'],
    media: ['7146', '7148', '7156'].map(n => img(`thumbs/eclipse-IMG_${n}.jpg`, 'The April 2024 solar eclipse')),
  },
  {
    id: 'life/little', group: 'life', title: 'A few little things', short: 'Little things', date: '',
    pairs: [['Song', 'Unethical · Faouzia'], ['Books', 'The Lord of the Rings'], ['Show', 'Avatar: The Last Airbender'], ['Hobbies', 'Ice hockey, rock climbing, hiking']],
    body: [],
    links: [link('Unethical on YouTube', 'https://www.youtube.com/watch?v=I1zqCX3Dvxo')],
  },

  // I/O pads
  { id: 'io/mail', group: 'io', title: 'Email', short: 'MAIL', href: 'mailto:apyadav@wisc.edu', label: 'apyadav@wisc.edu' },
  { id: 'io/linkedin', group: 'io', title: 'LinkedIn', short: 'LNKD', href: 'https://linkedin.com/in/arihanyadav', label: 'in/arihanyadav' },
  { id: 'io/github', group: 'io', title: 'GitHub', short: 'GH', href: 'https://github.com/Air-crypto', label: 'Air-crypto' },
  { id: 'io/resume', group: 'io', title: 'Résumé', short: 'CV', href: 'assets/arihan-yadav-resume.pdf', label: 'PDF' },
];

// Older links keep working.
export const ALIASES = {
  contact: 'io', about: 'me', experience: 'work', 'projects/ml': 'projects', 'projects/systems': 'projects',
  life: 'life', work: 'work', projects: 'projects', gallery: 'life', swimming: 'life/madison',
  flights: 'life/flights', madison: 'life/madison', aurora: 'life/aurora', eclipse: 'life/eclipse',
  sanfrancisco: 'life/sf', skating: 'life/skating', littlethings: 'life/little',
};
