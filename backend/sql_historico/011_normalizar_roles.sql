INSERT INTO roles (name)
VALUES ('administrador'), ('gerente'), ('operario')
ON CONFLICT (name) DO NOTHING;

UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'administrador')
WHERE role_id IN (SELECT id FROM roles WHERE name = 'admin');

UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'gerente')
WHERE role_id IN (SELECT id FROM roles WHERE name = 'gerencia');

DELETE FROM roles
WHERE name IN ('admin', 'gerencia');
