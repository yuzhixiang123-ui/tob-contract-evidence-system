-- 更新数据库，添加手机号码字段
USE contract_evidence;

-- 检查phone字段是否存在，如果不存在则添加
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'phone';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) AFTER email')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加phone字段的索引
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (index_name = 'idx_phone')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX idx_phone (', @columnname, ')')
));
PREPARE indexIfNotExists FROM @preparedStatement;
EXECUTE indexIfNotExists;
DEALLOCATE PREPARE indexIfNotExists;

SELECT '数据库更新完成！' AS message;
