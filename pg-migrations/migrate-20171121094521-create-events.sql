CREATE TABLE events (
    sequence_number SERIAL PRIMARY KEY,
    type text NOT NULL,
    entity_uid uuid NOT NULL,
    entity_version integer NOT NULL,
    data jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
ALTER TABLE ONLY events
    ADD CONSTRAINT events_entity_uid_entity_version_unique UNIQUE (entity_uid, entity_version);
