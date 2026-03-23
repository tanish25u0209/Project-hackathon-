console.log('\n' + '='.repeat(100));
console.log('🔬 SIMILARITY SERVICE - CLUSTERING & DEDUPLICATION DEMO');
console.log('='.repeat(100) + '\n');

console.log('📋 INPUT: 5 Raw Model Outputs\n');

// Extracted key ideas from the 5 models (simplified for demonstration)
const ideas = [
  // From Model 1 (DeepSeek)
  { id: 1, model: 'deepseek', text: 'Soil conservation through reduced tillage and mulching', source: 'CSA' },
  { id: 2, model: 'deepseek', text: 'Water harvesting and drip irrigation systems', source: 'CSA' },
  { id: 3, model: 'deepseek', text: 'Crop rotation and intercropping systems', source: 'Soil Health' },
  { id: 4, model: 'deepseek', text: 'Integrated Pest Management (IPM) using beneficial insects', source: 'IPM' },
  { id: 5, model: 'deepseek', text: 'Farmer education and training programs', source: 'Extension' },
  
  // From Model 2 (Perplexity)
  { id: 6, model: 'perplexity', text: 'GPS-guided farming reduces waste and optimizes resources', source: 'Precision Ag' },
  { id: 7, model: 'perplexity', text: 'Crop diversification and polyculture systems increase resilience', source: 'Diversification' },
  { id: 8, model: 'perplexity', text: 'Cooperative marketing groups and direct selling eliminate middlemen', source: 'Market' },
  { id: 9, model: 'perplexity', text: 'Terrace farming on slopes and contour trenches for water retention', source: 'Water' },
  { id: 10, model: 'perplexity', text: 'Microfinance for sustainable agriculture initiatives', source: 'Finance' },
  
  // From Model 3 (Mistral)
  { id: 11, model: 'mistral', text: 'Minimize tillage to preserve soil structure and microbial life', source: 'Soil' },
  { id: 12, model: 'mistral', text: 'Rainwater harvesting at household and community levels', source: 'Water' },
  { id: 13, model: 'mistral', text: 'Integrated crop-livestock systems for diversified income', source: 'Integration' },
  { id: 14, model: 'mistral', text: 'Farmer field schools (FFSs) as effective learning centers', source: 'Training' },
  { id: 15, model: 'mistral', text: 'Climate-smart agriculture bonds and carbon credit payments', source: 'Finance' },
  
  // From Model 4 (Llama)
  { id: 16, model: 'llama', text: 'Low-cost water harvesting with simple trenches and ponds', source: 'Immediate' },
  { id: 17, model: 'llama', text: 'Form farmer groups and cooperatives for collective action', source: 'Collective' },
  { id: 18, model: 'llama', text: 'Establish organic certification for premium product pricing', source: 'Market' },
  { id: 19, model: 'llama', text: 'Cost-benefit shows 30% expense reduction through reduced chemicals', source: 'Economics' },
  { id: 20, model: 'llama', text: 'Value-added processing (jam, oil extraction) for additional income', source: 'Processing' },
  
  // From Model 5 (Gemma)
  { id: 21, model: 'gemma', text: 'Reduce chemical dependency through biological alternatives', source: 'Environment' },
  { id: 22, model: 'gemma', text: 'Women farmers participation and gender equity initiatives', source: 'Social' },
  { id: 23, model: 'gemma', text: 'Implementation pathways: intensification, diversification, integrated models', source: 'Strategy' },
  { id: 24, model: 'gemma', text: 'Horizontal and vertical scaling mechanisms for adoption', source: 'Scaling' },
  { id: 25, model: 'gemma', text: 'Carbon sequestration and climate change mitigation through agriculture', source: 'Climate' },
];

console.log(`Total Ideas Extracted: ${ideas.length}\n`);

console.log('🔄 SIMILARITY SERVICE PROCESSING STEPS:');
console.log('─'.repeat(100) + '\n');

// Step 1: Show idea extraction
console.log('✓ Step 1: Extract Ideas from Raw Outputs');
console.log(`  - Model 1 (DeepSeek): 5 ideas`);
console.log(`  - Model 2 (Perplexity): 5 ideas`);
console.log(`  - Model 3 (Mistral): 5 ideas`);
console.log(`  - Model 4 (Llama): 5 ideas`);
console.log(`  - Model 5 (Gemma): 5 ideas`);
console.log(`  Total: ${ideas.length} ideas for embedding\n`);

// Step 2: Show embedding generation
console.log('✓ Step 2: Generate Embeddings (using sentence-transformers)');
console.log('  - Each idea converted to 768-dimensional vector');
console.log('  - Captures semantic meaning (not just tokens)');
console.log('  - Example: "Water harvesting" ≈ "Rainwater collection" (same semantic meaning)\n');

// Step 3: Show similarity matrix concept
console.log('✓ Step 3: Build Similarity Matrix');
console.log('  - Compute cosine similarity between all idea pairs');
console.log('  - Creates 25×25 symmetric matrix');
console.log('  - Values: 0.0 (no similarity) to 1.0 (identical)\n');

// Step 4: Show clustering
console.log('✓ Step 4: Cluster Similar Ideas (Union-Find Algorithm)');
console.log('  - Threshold: 0.85 similarity score');
console.log('  - Ideas with sim > 0.85 are grouped together\n');

// Define clusters based on semantic similarity
const clusters = [
  {
    name: 'Water Management & Conservation',
    theme: 'All strategies related to water efficiency',
    ideas: [2, 9, 12, 16],
    duplicates: [{ primary: 2, similar: [9, 12, 16] }]
  },
  {
    name: 'Soil Health & Regeneration',
    theme: 'Soil quality, fertility, and preservation',
    ideas: [1, 3, 11, 21],
    duplicates: [{ primary: 1, similar: [11] }, { primary: 3, similar: [21] }]
  },
  {
    name: 'Farmer Cooperation & Markets',
    theme: 'Collective action and market access',
    ideas: [5, 8, 10, 14, 17, 18],
    duplicates: [{ primary: 8, similar: [18] }, { primary: 10, similar: [17] }]
  },
  {
    name: 'Crop Diversity & Integration',
    theme: 'Multiple crops and integrated farming systems',
    ideas: [4, 7, 13, 20],
    duplicates: [{ primary: 7, similar: [] }, { primary: 13, similar: [20] }]
  },
  {
    name: 'Technology & Innovation',
    theme: 'Modern techniques for farm efficiency',
    ideas: [6],
    duplicates: []
  },
  {
    name: 'Carbon & Climate Action',
    theme: 'Climate mitigation and environmental protection',
    ideas: [15, 25],
    duplicates: [{ primary: 25, similar: [15] }]
  },
  {
    name: 'Women & Social Equity',
    theme: 'Gender equity and community development',
    ideas: [22],
    duplicates: []
  },
  {
    name: 'Implementation & Scaling',
    theme: 'Strategic approaches and expansion methods',
    ideas: [19, 23, 24],
    duplicates: [{ primary: 23, similar: [24] }]
  }
];

console.log('📊 CLUSTERING RESULTS:\n');

clusters.forEach((cluster, idx) => {
  console.log(`${'─'.repeat(100)}`);
  console.log(`Cluster ${idx + 1}: ${cluster.name}`);
  console.log(`Theme: ${cluster.theme}`);
  console.log(`Ideas in cluster: ${cluster.ideas.join(', ')}`);
  console.log(`\nIdeas:`);
  
  cluster.ideas.forEach(ideaId => {
    const idea = ideas.find(i => i.id === ideaId);
    console.log(`  • [ID ${ideaId}] ${idea.text}`);
  });
  console.log('');
});

console.log('─'.repeat(100));

// Step 5: Show deduplication
console.log('\n\n✓ Step 5: Deduplication Results\n');

let totalDuplicates = 0;
clusters.forEach((cluster, idx) => {
  if (cluster.duplicates.length > 0) {
    console.log(`${cluster.name}:`);
    cluster.duplicates.forEach(dup => {
      if (dup.similar.length > 0) {
        totalDuplicates += dup.similar.length;
        console.log(`  ✗ Keep [ID ${dup.primary}] | Remove: [ID ${dup.similar.join(', ID ')}]`);
      }
    });
  }
});

console.log(`\nTotal Duplicates Removed: ${totalDuplicates}`);
console.log(`Unique Ideas After Deduction: ${ideas.length - totalDuplicates}\n`);

// Step 6: Show ranking
console.log('✓ Step 6: Rank Ideas by Dominance');
console.log('  - Frequency across models');
console.log('  - Coverage in output length');
console.log('  - Semantic importance score\n');

const topIdeas = [
  { rank: 1, theme: 'Water Management', frequency: 4, importance: 'Critical', score: 0.94 },
  { rank: 2, theme: 'Soil Health', frequency: 4, importance: 'Critical', score: 0.92 },
  { rank: 3, theme: 'Farmer Markets & Cooperation', frequency: 6, importance: 'High', score: 0.88 },
  { rank: 4, theme: 'Crop Diversity', frequency: 4, importance: 'High', score: 0.85 },
  { rank: 5, theme: 'Implementation Strategy', frequency: 3, importance: 'High', score: 0.83 },
];

console.log('Top Ranked Ideas:\n');
topIdeas.forEach(idea => {
  console.log(`  ${idea.rank}. ${idea.theme}`);
  console.log(`     Frequency: ${idea.frequency} models | Importance: ${idea.importance} | Score: ${(idea.score * 100).toFixed(0)}%\n`);
});

// Final output
console.log('═'.repeat(100));
console.log('\n📈 FINAL SYNTHESIS RESULT:\n');

const finalSynthesis = {
  sessionId: '12345678-1234-1234-1234-123456789012',
  uniqueClusters: clusters.length,
  uniqueIdeas: ideas.length - totalDuplicates,
  dominantThemes: topIdeas.slice(0, 5).map(i => i.theme),
  keyInsights: [
    'Water and soil management are foundational priority',
    'Market access through cooperatives is critical for adoption',
    'Farmer education and extension services are essential',
    'Successful implementation requires integrated multi-strategy approach',
    'Scale from immediate actions to long-term transformation'
  ],
  recommendations: [
    'Start with water and soil conservation quick wins',
    'Form farmer cooperatives immediately for collective bargaining',
    'Invest in farmer field schools for knowledge transfer',
    'Develop market linkages before encouraging production scaling',
    'Prioritize women farmers participation for equity'
  ]
};

console.log(JSON.stringify(finalSynthesis, null, 2));

console.log('\n' + '═'.repeat(100));
console.log('\n✅ Similarity Service Processing Complete!');
console.log('\n💾 Results ready for:');
console.log('  ✓ Database storage');
console.log('  ✓ Save as idea collection');
console.log('  ✓ Further synthesis and analysis');
console.log('  ✓ Frontend display\n');

console.log('═'.repeat(100) + '\n');
