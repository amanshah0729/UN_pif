import { supabase } from './supabaseClient';

export interface CountryRecord {
  id: number;
  name: string;
  sections: Record<string, unknown> | null;
}

function normalizeCountryName(name: string) {
  return name.trim();
}

export async function getCountryByName(name: string) {
  const normalized = normalizeCountryName(name);

  const { data, error } = await supabase
    .from('countries')
    .select('id, name, sections')
    .ilike('name', normalized)
    .limit(1)
    .maybeSingle<CountryRecord>();

  if (error) {
    return { country: null, error };
  }

  return { country: data, error: null };
}

export async function getCountrySection(name: string, sectionKey: string) {
  const { country, error } = await getCountryByName(name);
  if (error || !country) {
    return { section: null, error: error ?? new Error('Country not found') };
  }

  const sections = country.sections as Record<string, unknown> | null;
  const section = sections ? sections[sectionKey] ?? null : null;
  return { section, error: null };
}


