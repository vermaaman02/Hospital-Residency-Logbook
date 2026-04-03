-- Seed FormDefinition table with all 22 form types
-- This migration populates the FormDefinition table that was created in
-- 20260401054836_add_department_form_management but never seeded in production.

INSERT INTO "FormDefinition" ("id", "slug", "title", "category", "icon", "route", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  -- ═══ Academic (7) ═══
  (gen_random_uuid(), 'rotation-postings',   'Rotation Postings',    'Academic',      'MapPin',         '/rotation-postings',    1,  true, NOW(), NOW()),
  (gen_random_uuid(), 'thesis',              'Thesis Tracking',      'Academic',      'BookOpen',       '/thesis',               2,  true, NOW(), NOW()),
  (gen_random_uuid(), 'attendance',          'Attendance',           'Academic',      'CalendarCheck',  '/attendance',           3,  true, NOW(), NOW()),
  (gen_random_uuid(), 'case-presentations',  'Case Presentations',   'Academic',      'Presentation',   '/case-presentations',   4,  true, NOW(), NOW()),
  (gen_random_uuid(), 'seminar-discussions', 'Seminar Discussions',  'Academic',      'MessageSquare',  '/seminars',             5,  true, NOW(), NOW()),
  (gen_random_uuid(), 'journal-clubs',       'Journal Clubs',        'Academic',      'BookMarked',     '/journal-clubs',        6,  true, NOW(), NOW()),
  (gen_random_uuid(), 'internal-assessments','Internal Assessments', 'Academic',      'FileCheck',      '/internal-assessments', 7,  true, NOW(), NOW()),

  -- ═══ Clinical (7) ═══
  (gen_random_uuid(), 'clinical-skills',     'Clinical Skills',      'Clinical',      'Stethoscope',    '/clinical-skills',      10, true, NOW(), NOW()),
  (gen_random_uuid(), 'case-management',     'Case Management Logs', 'Clinical',      'ClipboardList',  '/case-management',      11, true, NOW(), NOW()),
  (gen_random_uuid(), 'procedure-logs',      'Procedure Logs',       'Clinical',      'Syringe',        '/procedures',           12, true, NOW(), NOW()),
  (gen_random_uuid(), 'diagnostic-skills',   'Diagnostic Skills',    'Clinical',      'Activity',       '/diagnostics',          13, true, NOW(), NOW()),
  (gen_random_uuid(), 'imaging-logs',        'Imaging Logs',         'Clinical',      'Scan',           '/imaging',              14, true, NOW(), NOW()),
  (gen_random_uuid(), 'transport-logs',      'Transport Logs',       'Clinical',      'Ambulance',      '/transport',            15, true, NOW(), NOW()),
  (gen_random_uuid(), 'consent-bad-news',    'Consent & Bad News',   'Clinical',      'FileWarning',    '/consent-bad-news',     16, true, NOW(), NOW()),

  -- ═══ Professional (8) ═══
  (gen_random_uuid(), 'life-support-courses','Life Support Courses', 'Professional',  'HeartPulse',     '/life-support-courses', 20, true, NOW(), NOW()),
  (gen_random_uuid(), 'conferences',         'Conferences',          'Professional',  'Users',          '/conferences',          21, true, NOW(), NOW()),
  (gen_random_uuid(), 'research-activities', 'Research Activities',  'Professional',  'FlaskConical',   '/research-activities',  22, true, NOW(), NOW()),
  (gen_random_uuid(), 'disaster-drills',     'Disaster Drills',      'Professional',  'AlertTriangle',  '/disaster-drills',      23, true, NOW(), NOW()),
  (gen_random_uuid(), 'quality-improvement', 'Quality Improvement',  'Professional',  'TrendingUp',     '/quality-improvement',  24, true, NOW(), NOW()),
  (gen_random_uuid(), 'logbook-reviews',     'Logbook Reviews',      'Professional',  'ClipboardCheck', '/logbook-reviews',      25, true, NOW(), NOW()),
  (gen_random_uuid(), 'evaluation-graph',    'Evaluation Graph',     'Professional',  'BarChart3',      '/evaluation-graph',     26, true, NOW(), NOW()),
  (gen_random_uuid(), 'training-mentoring',  'Training & Mentoring', 'Professional',  'GraduationCap',  '/training-mentoring',   27, true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;
