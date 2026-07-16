-- ============================================================================
-- Seed data for Pak Madina Public School
-- Classes (Nursery–Class 8, one default Section A each) and the 9 subjects.
-- Safe to re-run: skips rows that already exist.
-- ============================================================================

insert into classes (name, sort_order)
select v.name, v.sort_order from (values
  ('Nursery', 1), ('KG', 2), ('Class 1', 3), ('Class 2', 4), ('Class 3', 5),
  ('Class 4', 6), ('Class 5', 7), ('Class 6', 8), ('Class 7', 9), ('Class 8', 10)
) as v(name, sort_order)
where not exists (select 1 from classes c where c.name = v.name);

insert into sections (class_id, name)
select c.id, 'A' from classes c
where not exists (select 1 from sections s where s.class_id = c.id and s.name = 'A');

insert into subjects (name)
select v.name from (values
  ('English'), ('Urdu'), ('Sindhi'), ('Mathematics'), ('Science'),
  ('Social Studies'), ('Islamiat'), ('Computer Science'), ('Nazra-e-Quran')
) as v(name)
where not exists (select 1 from subjects s where s.name = v.name);
