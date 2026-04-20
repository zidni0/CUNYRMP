const RMP_ENDPOINT = "https://www.ratemyprofessors.com/graphql";
const RMP_AUTH = "Basic dGVzdDp0ZXN0";

async function rmpFetch(query, variables) {
  const res = await fetch(RMP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": RMP_AUTH
    },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const err = new Error(`RMP HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

const SEARCH_SCHOOL_QUERY = `
  query SearchSchool($text: String!) {
    newSearch {
      schools(query: { text: $text }) {
        edges {
          node { id name city state }
        }
      }
    }
  }
`;

const SEARCH_PROF_QUERY = `
  query SearchProf($text: String!, $schoolID: ID!) {
    newSearch {
      teachers(query: { text: $text, schoolID: $schoolID }) {
        edges {
          node {
            id legacyId firstName lastName
            avgRating avgDifficulty numRatings
            wouldTakeAgainPercent department
          }
        }
      }
    }
  }
`;

const FETCH_RATINGS_QUERY = `
  query FetchRatings($id: ID!) {
    node(id: $id) {
      ... on Teacher {
        ratings(first: 20) {
          edges {
            node { comment date difficultyRating helpfulRating }
          }
        }
      }
    }
  }
`;

async function searchSchool(name) {
  const data = await rmpFetch(SEARCH_SCHOOL_QUERY, { text: name });
  const edges = data?.newSearch?.schools?.edges ?? [];
  if (!edges.length) return null;
  const exact = edges.find(e => e.node.name === name)
    ?? edges.find(e => e.node.name.toLowerCase() === name.toLowerCase());
  return (exact ?? edges[0]).node;
}

async function searchProfessor(name, schoolId) {
  const data = await rmpFetch(SEARCH_PROF_QUERY, { text: name, schoolID: schoolId });
  return (data?.newSearch?.teachers?.edges ?? []).map(e => e.node);
}

async function fetchRatings(nodeId) {
  const data = await rmpFetch(FETCH_RATINGS_QUERY, { id: nodeId });
  const edges = data?.node?.ratings?.edges ?? [];
  return edges.map(e => e.node);
}

export { searchSchool, searchProfessor, fetchRatings };
