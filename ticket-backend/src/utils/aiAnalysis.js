'use strict';

const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Analyse un ticket pour extraire catégorie, département, priorité et mots-clés
 * @param {string} subject      - Sujet du ticket
 * @param {string} description  - Description du ticket
 * @param {Array}  categories   - Liste des catégories [{ id, name }]
 * @param {Array}  departments  - Liste des départements [{ id, name }]
 * @returns {Object} Résultat de l'analyse structuré
 */
async function analyzeTicket(subject, description, categories = [], departments = []) {
  try {
    // 1. Vérification de la clé API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY non configurée — analyse IA annulée');
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Utilisation de Gemini 1.5 Flash (Rapide et précis pour le JSON)
    const model = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview", // C'est le modèle actuel en 2026
    generationConfig: { responseMimeType: "application/json" }



});

    // 2. Préparation des listes dynamiques pour le prompt
    const categoriesList = categories.length
      ? categories.map(c => `- ${c.name} (id: ${c.id})`).join('\n')
      : 'Déterminer selon le contexte technique ou commercial';

    const departmentsList = departments.length
      ? departments.map(d => `- ${d.name} (id: ${d.id})`).join('\n')
      : 'Déterminer selon le contexte (Support, Finance, RH, etc.)';

    // 3. Construction du Prompt
    const prompt = `Tu es un expert en tri de tickets de support client.
Analyse le ticket suivant et détermine la catégorie, le département responsable et la priorité.

TICKET À ANALYSER:
Sujet: ${subject}
Description: ${description}

LISTE DES CATÉGORIES DISPONIBLES:
${categoriesList}

LISTE DES DÉPARTEMENTS DISPONIBLES:
${departmentsList}

CONSIGNES STRICTES:
1. Choisis le "department_id" et le "category_id" les plus cohérents dans les listes fournies.
2. Si aucune correspondance exacte n'existe pour l'ID, mets null mais suggère un nom logique.
3. Le champ "confidence_score" doit être un NOMBRE ENTIER entre 0 et 100.
4. Retourne UNIQUEMENT un objet JSON valide.

FORMAT JSON ATTENDU:
{
  "category_id": number|null,
  "category_name": "string",
  "department_id": number|null,
  "department_name": "string",
  "priority": "critical|high|medium|low",
  "keywords": ["mot1", "mot2", "mot3"],
  "confidence_score": number,
  "summary": "résumé en une phrase",
  "sentiment": "positive|neutral|negative|urgent"
}`;

    // 4. Appel à l'API Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 5. Nettoyage et parsing du JSON
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // 6. Correction du score de confiance (sécurité anti-1%)
    let finalConfidence = parsed.confidence_score || 0;
    // Si l'IA renvoie 0.95 au lieu de 95, on multiplie par 100
    if (finalConfidence > 0 && finalConfidence <= 1) {
      finalConfidence = Math.round(finalConfidence * 100);
    }

    // 7. Retour structuré pour le frontend
    return {
      category_id:     parsed.category_id || null,
      category_name:   parsed.category_name || "Inconnu",
      department_id:   parsed.department_id || null,
      department_name: parsed.department_name || "Non assigné",
      priority:        parsed.priority || 'medium',
      keywords:        parsed.keywords || [],
      confidence:      finalConfidence,
      summary:         parsed.summary || "",
      sentiment:       parsed.sentiment || 'neutral'
    };

  } catch (err) {
    console.error('Erreur analyzeTicket avec Gemini:', err.message);
    // En cas d'erreur, on retourne null pour que le système puisse continuer manuellement
    return null;
  }
}

module.exports = { analyzeTicket };