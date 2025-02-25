import { Connection } from "typeorm";
import test from "ava";
import { orm } from "../../../../../../thirdPartyService/TypeORMService";
import { RoomStatus, RoomType } from "../../../../../../model/room/Constants";
import { RoomDAO, RoomUserDAO } from "../../../../../../dao";
import { v4 } from "uuid";
import { Region } from "../../../../../../constants/Project";
import { alreadyJoinedRoomCount } from "../AlreadyJoinedRoomCount";

const namespace =
    "[api][api-v1][api-v1-user][api-v1-user-deleteAccount][api-v1-user-deleteAccount-utils][utils]";

let connection: Connection;
test.before(`${namespace} - connection orm`, async () => {
    connection = await orm();
});

test.after(`${namespace} - close orm`, async () => {
    await connection.close();
});

const createRoom = async (userUUID: string, roomStatus: RoomStatus): Promise<void> => {
    const roomUUID = v4();

    await RoomDAO().insert({
        periodic_uuid: "",
        owner_uuid: userUUID,
        title: v4(),
        room_type: RoomType.OneToOne,
        room_status: roomStatus,
        room_uuid: roomUUID,
        whiteboard_room_uuid: v4(),
        begin_time: new Date(),
        end_time: new Date(),
        region: Region.CN_HZ,
    });

    await RoomUserDAO().insert({
        room_uuid: roomUUID,
        user_uuid: userUUID,
        rtc_uid: "113",
    });
};

test(`${namespace} - should be no stopped rooms`, async ava => {
    const userUUID = v4();

    await createRoom(userUUID, RoomStatus.Started);
    await createRoom(userUUID, RoomStatus.Idle);
    await createRoom(userUUID, RoomStatus.Paused);
    await createRoom(userUUID, RoomStatus.Stopped);

    const count = await alreadyJoinedRoomCount(userUUID);

    ava.is(count, 3);
});
