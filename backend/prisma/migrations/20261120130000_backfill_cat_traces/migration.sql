-- Trello card short IDs from traces.txt; match the complete ID, not a prefix.
UPDATE "Cat"
SET "traces" = true,
    "version" = "version" + 1,
    "concurrencyToken" = gen_random_uuid()::text,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "traces" = false
  AND substring("trelloUrl" FROM '(?i)^https://trello[.]com/c/([^/?#]+)') IN (
    'gt5iYVuO', 'uDjz77be', 'NCpTzPlT', 'kNHHt1gQ', 'bFnuQoGn',
    '8ZH0mzpd', '1kbpvyOT', 'PWgr7KrG', 'd9pwC644', '2vECocPd',
    'ljEPqo0j', '16lcymiT', 'bbBiVV8m', 'lAem5MzV', 'Qm6WwohY',
    'pyh9QbKZ', 'ZHHOmkvp', 'fgZsXv1X', 'p0be9fl7', 'D8KdW2DM',
    'A7oBaDqG', 'a9W06EFf', 'K28ZB4hz', 'H0XoeavC', 'EsznRRkB',
    'ljxe6hqB', '2SomHum2', 'wMU76Vh2', 'W7p26bbL', 'hX3D25xF',
    'W8oHNrdB', 'wE2hwo7R', '8KiJdNTE', 'Mm53GFg1', 'AjZ4gXgv',
    'gRdXgbIE', '8pyoAxNS', '2wqT5th8', 'ovYnScJB', 'UlDIHJCL',
    'pfd5gRrq', 't8BF1Ijp', 'wyrfhb71', '9hLKdge0', 'FAsm8U7N',
    'ISMHLzFk', 'SvicW9mA', 'U9xFiQrl', 'KzfMmIaW', 'uLiNF2D3',
    'rWXoDCgG', '6BXL4yDZ', 'BqcbgWB7', '87cM0fyI', 'q3Krqtu3',
    '4wytvTuI', 'rrNUPz7y', '6AA7CWrD', '3eRdNk2r', 'aTO0Su1h',
    'B7zEaj6e', 'tWTmuTIh', 'JtoayUOb', 'RehNb0eD', '6iT4Owf1',
    'a7VHUmRT', 'IwGMqXyG', 'eHgw3dFI', 'GjpZilM7', 'WzmbD49z',
    'ooEGRCCT', 'VR6LzbjZ', 'M8PbVKyU', 'SSTpvfVE', 'i26rCHFG',
    'rgu2QXxa', 'OtitLLKl', 'dxzXhawf', 'z66zd5eF', 'ueRAAh6k',
    'FdcN33ds', 'jx0wH9DM', 'gQdaU722', 'eSellwxA', 'Mqw6kJxN',
    'c446qa8O', '1BMfACt2', 'Sf2h9Dgd', 'eo3UXIsE', 'KC1d5KZ9',
    'aqgyronk', 'RbltMDcT', 'VHjGRW1a', 'ZWIgoPpF', 'lLiGUnh1',
    'UNRWJnxY', 'qJ6e6hcc', 'ArNysXL4', 'vtXhIFEo', 'ZEjNYNvE',
    'JguvDqyI', 'h57dausJ', 'qze4OjzZ', '8mgAtef7', 'cC8FvyWU',
    'WWELwSMX', 'CKaGQ6s1', 'vwURR8BB', 'UmuL9AL0', 'vpEUP01U',
    'xp3L4wNz', '8yAxqlYC', 'aG1devgB', 'j6gfEmwu', '7zm8mdT1',
    'oiO0Rn83', 'BU4Abc1v', 'OdUppjSg', 'Xu20a6vQ', 'elg2uaW1',
    'N9H2Gjw5',
    'SX7Qo01e', 'OLpliWIT', 'z2nVdVSk', 'MeX2SySP', 'Nz1yKOph',
    '3h6mrc2L', 'ZMQ7Oka4', 'CoCIKbIZ', 'mX6VmB02', '5SSwUDst',
    'KrvYtIYF', 'dMOPRgI2', 'MwIcnLb3', 'BIhlfwpM', 'T6coW16m',
    'IMZMDL8s', '6ZZ9FsvL', 'qfcwPYuj', 'T5gAvvqr', '9SbvLH0i'
  );
